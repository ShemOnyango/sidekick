// mobile/src/services/gps/GPSTrackingService.js (Enhanced Version)
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert } from 'react-native';
import { store } from '../../store/store';
import databaseService from '../database/DatabaseService';
import socketService from '../socket/SocketService';
import { CONFIG } from '../../constants/config';

const GPS_TASK_NAME = 'herzog-gps-tracking';

class GPSTrackingService {
  constructor() {
    this.isTracking = false;
    this.currentPosition = null;
    this.watchId = null;
    this.backgroundTaskRegistered = false;
    this.lastSyncTime = null;
    this.currentAuthority = null;
    this.currentMilepost = null;
    this.currentTrackInfo = null;
    this.sentAlerts = new Map(); // Track sent alerts to avoid duplicates
  }

  async init() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Location permission denied');
      }

      if (CONFIG.GPS.BACKGROUND_TRACKING) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
        }
      }

      await this.registerBackgroundTask();
      return true;
    } catch (error) {
      console.error('GPS service initialization failed:', error);
      throw error;
    }
  }

  async registerBackgroundTask() {
    if (Platform.OS === 'android' && CONFIG.GPS.BACKGROUND_TRACKING) {
      try {
        TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
          if (error) {
            console.error('Background task error:', error);
            return;
          }

          if (data && data.locations && data.locations.length > 0) {
            await this.processLocationUpdate(data.locations[0], true);
          }
        });

        this.backgroundTaskRegistered = true;
      } catch (error) {
        console.error('Failed to register background task:', error);
      }
    }
  }

  async startTracking(authority) {
    try {
      if (this.isTracking) {
        await this.stopTracking();
      }

      this.currentAuthority = authority;
      this.sentAlerts.clear();

      // Start foreground tracking with higher accuracy
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: CONFIG.GPS.DISTANCE_FILTER,
          timeInterval: CONFIG.GPS.UPDATE_INTERVAL,
        },
        (location) => {
          this.processLocationUpdate(location, false);
        }
      );

      // Start background tracking if enabled
      if (CONFIG.GPS.BACKGROUND_TRACKING && this.backgroundTaskRegistered) {
        await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: CONFIG.GPS.DISTANCE_FILTER * 2, // Less frequent in background
          timeInterval: CONFIG.GPS.FASTEST_INTERVAL * 2,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Herzog Rail Authority',
            notificationBody: 'Tracking your position on tracks',
            notificationColor: '#FFD100',
          },
        });
      }

      this.isTracking = true;
      
      store.dispatch({
        type: 'gps/setTrackingStatus',
        payload: { isTracking: true },
      });

      console.log('GPS tracking started for authority:', authority.authority_id);
      
      return true;
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      throw error;
    }
  }

  async stopTracking() {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      if (CONFIG.GPS.BACKGROUND_TRACKING) {
        // Check if task is registered before stopping
        const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
          console.log('Background GPS tracking stopped');
        } else {
          console.log('GPS tracking task was not running');
        }
      }

      this.isTracking = false;
      this.currentPosition = null;
      this.currentAuthority = null;
      this.currentMilepost = null;
      this.currentTrackInfo = null;

      store.dispatch({
        type: 'gps/setTrackingStatus',
        payload: { isTracking: false },
      });

      console.log('GPS tracking stopped');
    } catch (error) {
      console.error('Failed to stop GPS tracking:', error);
    }
  }

  async processLocationUpdate(location, isBackground = false) {
    try {
      const { coords, timestamp } = location;
      const user = await databaseService.getUser();
      
      if (!user || !this.currentAuthority) {
        return;
      }

      // Get current track information
      this.currentTrackInfo = await this.getCurrentTrackInfo(coords);
      
      // Calculate current milepost based on track geometry
      this.currentMilepost = await this.calculateCurrentMilepost(coords);
      
      this.currentPosition = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
        altitude: coords.altitude,
        timestamp: new Date(timestamp).toISOString(),
        milepost: this.currentMilepost,
        trackType: this.currentTrackInfo?.trackType,
        trackNumber: this.currentTrackInfo?.trackNumber
      };

      // Save to local database
      await databaseService.saveGPSLog({
        User_ID: user.user_id,
        Authority_ID: this.currentAuthority.authority_id || this.currentAuthority.id,
        Latitude: coords.latitude,
        Longitude: coords.longitude,
        Speed: coords.speed,
        Heading: coords.heading,
        Accuracy: coords.accuracy,
        Milepost: this.currentMilepost,
        Is_Offline: isBackground,
      });

      // Update Redux state
      store.dispatch({
        type: 'gps/setCurrentPosition',
        payload: this.currentPosition,
      });

      store.dispatch({
        type: 'gps/setCurrentMilepost',
        payload: this.currentMilepost,
      });

      // Check boundary alerts
      await this.checkBoundaryAlerts();
      
      // Check proximity to other workers
      await this.checkProximityAlerts();

      // Send location update to server via socket
      if (socketService.isConnected()) {
        await this.sendLocationUpdate();
      }

      // Sync if needed
      await this.syncIfNeeded();

    } catch (error) {
      console.error('Failed to process location update:', error);
    }
  }

  async getCurrentTrackInfo(coords) {
    try {
      if (!this.currentAuthority) return null;

      // Query local database for nearest track segment
      const query = `
        SELECT 
          track_type,
          track_number,
          bmp,
          emp,
          asset_name
        FROM tracks 
        WHERE subdivision_id = ? 
          AND latitude IS NOT NULL 
          AND longitude IS NOT NULL
        ORDER BY 
          ABS(latitude - ?) + ABS(longitude - ?)
        LIMIT 1
      `;

      const result = await databaseService.executeQuery(query, [
        this.currentAuthority.subdivision_id,
        coords.latitude,
        coords.longitude
      ]);

      if (result.rows.length > 0) {
        return result.rows.item(0);
      }

      return null;
    } catch (error) {
      console.error('Error getting track info:', error);
      return null;
    }
  }

  async calculateCurrentMilepost(coords) {
    try {
      if (!this.currentAuthority) return null;

      // First try to get milepost from track geometry
      if (this.currentTrackInfo) {
        // Interpolate between BMP and EMP based on position
        const { bmp, emp } = this.currentTrackInfo;
        
        // Get nearest mileposts for more accurate calculation
          const mileposts = await databaseService.executeQuery(
            `SELECT mp, latitude, longitude 
             FROM milepost_geometry 
             WHERE subdivision_id = ? 
             ORDER BY ABS(latitude - ?) + ABS(longitude - ?) 
             LIMIT 2`,
            [this.currentAuthority.subdivision_id, coords.latitude, coords.longitude]
          );

          if (mileposts.rows.length >= 2) {
            const mp1 = mileposts.rows.item(0);
            const mp2 = mileposts.rows.item(1);

            // Project current position onto the segment between the two nearest mileposts
            // Use an equirectangular approximation for small distances to improve interpolation
            const proj = this.projectOntoSegment(
              { lat: coords.latitude, lng: coords.longitude },
              { lat: mp1.latitude, lng: mp1.longitude },
              { lat: mp2.latitude, lng: mp2.longitude }
            );

            if (proj && typeof proj.t === 'number') {
              const mpValue = parseFloat(mp1.mp) + proj.t * (parseFloat(mp2.mp) - parseFloat(mp1.mp));
              return mpValue.toFixed(2);
            }
          }
        
        // Fallback to track segment interpolation
        if (bmp && emp) {
          // Simple linear interpolation (for demo)
          // In production, this should use actual track geometry
          return ((parseFloat(bmp) + parseFloat(emp)) / 2).toFixed(2);
        }
      }

      return null;
    } catch (error) {
      console.error('Error calculating milepost:', error);
      return null;
    }
  }

  // Helpers: small-distance projection using equirectangular approximation
  projectOntoSegment(point, segA, segB) {
    const R = 6371000; // Earth radius meters

    // Convert lat/lng to meters using origin at segA.lat
    const toMeters = (lat, lng, lat0) => {
      const x = (lng * Math.PI / 180) * R * Math.cos(lat0 * Math.PI / 180);
      const y = (lat * Math.PI / 180) * R;
      return { x, y };
    };

    const lat0 = segA.lat;
    const p = toMeters(point.lat, point.lng, lat0);
    const a = toMeters(segA.lat, segA.lng, lat0);
    const b = toMeters(segB.lat, segB.lng, lat0);

    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = p.x - a.x;
    const wy = p.y - a.y;

    const vlen2 = vx * vx + vy * vy;
    if (vlen2 === 0) return null;

    const t = (wx * vx + wy * vy) / vlen2;

    // clamp t to segment
    const tClamped = Math.max(0, Math.min(1, t));

    const projX = a.x + vx * tClamped;
    const projY = a.y + vy * tClamped;

    const dx = p.x - projX;
    const dy = p.y - projY;
    const distanceFromSegment = Math.sqrt(dx * dx + dy * dy);

    return { t: tClamped, distance: distanceFromSegment };
  }

  async checkBoundaryAlerts() {
    if (!this.currentAuthority || !this.currentMilepost) return;

    const beginMP = parseFloat(this.currentAuthority.begin_mp);
    const endMP = parseFloat(this.currentAuthority.end_mp);
    const currentMP = parseFloat(this.currentMilepost);
    
    const distanceToBegin = Math.abs(currentMP - beginMP);
    const distanceToEnd = Math.abs(currentMP - endMP);
    const minDistance = Math.min(distanceToBegin, distanceToEnd);
    const boundary = distanceToBegin < distanceToEnd ? 'begin' : 'end';

    // Get alert configurations from local database
    const alertConfigs = await databaseService.executeQuery(`
      SELECT * FROM alert_configurations 
      WHERE agency_id = ? 
        AND config_type = 'Boundary_Alert'
        AND is_active = 1
      ORDER BY distance_miles ASC
    `, [this.currentAuthority.agency_id]);

    for (let i = 0; i < alertConfigs.rows.length; i++) {
      const config = alertConfigs.rows.item(i);
      const alertKey = `boundary_${boundary}_${config.distance_miles}`;
      
      if (minDistance <= config.distance_miles) {
        if (!this.sentAlerts.has(alertKey)) {
          this.sentAlerts.set(alertKey, true);
          
          await this.sendLocalAlert({
            type: 'BOUNDARY_ALERT',
            level: config.alert_level,
            title: `${config.alert_level.toUpperCase()} Boundary Alert`,
            message: `Approaching ${boundary} boundary (${minDistance.toFixed(2)} miles)`,
            data: {
              authorityId: this.currentAuthority.authority_id || this.currentAuthority.id,
              boundary: boundary,
              distance: minDistance,
              alertThreshold: config.distance_miles,
              milepost: this.currentMilepost
            }
          });
        }
        break; // Only show the closest threshold alert
      }
    }
  }

  async checkProximityAlerts() {
    if (!this.currentPosition || !socketService.isConnected()) return;

    // Request proximity check from server via socket
    socketService.emit('check-proximity', {
      authorityId: this.currentAuthority?.authority_id || this.currentAuthority?.id,
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude,
      subdivisionId: this.currentAuthority?.subdivision_id,
      agencyId: this.currentAuthority?.agency_id,
      timestamp: new Date().toISOString()
    });
  }

  async sendLocationUpdate() {
    if (!this.currentPosition || !this.currentAuthority) return;

    socketService.emit('location-update', {
      userId: (await databaseService.getUser())?.user_id,
      agencyId: this.currentAuthority.agency_id,
      authorityId: this.currentAuthority.authority_id || this.currentAuthority.id,
      latitude: this.currentPosition.latitude,
      longitude: this.currentPosition.longitude,
      milepost: this.currentMilepost,
      speed: this.currentPosition.speed,
      heading: this.currentPosition.heading,
      accuracy: this.currentPosition.accuracy,
      timestamp: this.currentPosition.timestamp
    });
  }

  async sendLocalAlert(alertData) {
    try {
      const user = await databaseService.getUser();
      
      if (user) {
        // Save to local database
        await databaseService.saveAlert({
          User_ID: user.user_id,
          Authority_ID: this.currentAuthority?.authority_id || this.currentAuthority?.id,
          Alert_Type: alertData.type,
          Alert_Level: alertData.level,
          Message: alertData.message,
          Triggered_Distance: alertData.data?.distance,
          Is_Delivered: 1,
          Delivered_Time: new Date().toISOString(),
          Is_Read: 0
        });

        // Update Redux state
        store.dispatch({
          type: 'alerts/addAlert',
          payload: alertData,
        });

        // Show native alert if app is in foreground
        Alert.alert(
          alertData.title,
          alertData.message,
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    } catch (error) {
      console.error('Failed to send local alert:', error);
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async syncIfNeeded() {
    try {
      const now = Date.now();
      if (this.lastSyncTime && now - this.lastSyncTime < 30000) {
        return;
      }

      // Sync pending GPS logs
      const pendingLogs = await databaseService.getPendingGPSLogs(50);
      
      if (pendingLogs.length > 0 && socketService.isConnected()) {
        // Use your existing apiService to sync logs
        // This would be implemented in your sync service
        console.log(`Syncing ${pendingLogs.length} GPS logs...`);
      }

      this.lastSyncTime = now;
    } catch (error) {
      console.error('GPS sync failed:', error);
    }
  }

  getCurrentPosition() {
    return this.currentPosition;
  }

  getCurrentMilepost() {
    return this.currentMilepost;
  }

  getCurrentTrackInfo() {
    return this.currentTrackInfo;
  }

  isTracking() {
    return this.isTracking;
  }

  getCurrentAuthority() {
    return this.currentAuthority;
  }

  async cleanup() {
    await this.stopTracking();
  }
}

const gpsTrackingService = new GPSTrackingService();
export default gpsTrackingService;
