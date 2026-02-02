/**
 * Proximity Alert Service
 * 
 * Monitors GPS location and triggers alerts when approaching:
 * - Other authorities (overlap zones)
 * - Authority boundaries
 * - Infrastructure pins
 */

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ALERT_DISTANCES, COLORS } from '../../constants/theme';
import { calculateTrackDistance, getCurrentTrack } from '../../utils/trackGeometry';

class ProximityAlertService {
  constructor() {
    this.isMonitoring = false;
    this.locationSubscription = null;
    this.alertHistory = new Map(); // Track recent alerts to avoid spam
    this.alertSounds = {};
    this.lastPosition = null;
    this.mileposts = [];
    this.nearbyAuthorities = [];
    this.activeAuthority = null;
  }

  async initialize() {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Load alert sounds
    await this.loadAlertSounds();
  }

  async loadAlertSounds() {
    try {
      this.alertSounds.informational = await Audio.Sound.createAsync(
        require('../../assets/sounds/alert_info.mp3'),
        { shouldPlay: false }
      );
      this.alertSounds.warning = await Audio.Sound.createAsync(
        require('../../assets/sounds/alert_warning.mp3'),
        { shouldPlay: false }
      );
      this.alertSounds.critical = await Audio.Sound.createAsync(
        require('../../assets/sounds/alert_critical.mp3'),
        { shouldPlay: false }
      );
      this.alertSounds.emergency = await Audio.Sound.createAsync(
        require('../../assets/sounds/alert_emergency.mp3'),
        { shouldPlay: false }
      );
    } catch (error) {
      console.warn('Could not load alert sounds:', error);
    }
  }

  setMilepostData(mileposts) {
    this.mileposts = mileposts;
  }

  setNearbyAuthorities(authorities) {
    this.nearbyAuthorities = authorities;
  }

  setActiveAuthority(authority) {
    this.activeAuthority = authority;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Request background location permissions
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
    }

    this.isMonitoring = true;

    // Start watching position
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000, // Update every 2 seconds
        distanceInterval: 10, // Or when moved 10 meters
      },
      (location) => {
        this.handleLocationUpdate(location);
      }
    );

    console.log('Proximity monitoring started');
  }

  stopMonitoring() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isMonitoring = false;
    this.alertHistory.clear();
    console.log('Proximity monitoring stopped');
  }

  handleLocationUpdate(location) {
    const { latitude, longitude } = location.coords;

    if (!this.mileposts || this.mileposts.length === 0) {
      return; // No tracking data available
    }

    const currentTrack = getCurrentTrack(latitude, longitude, this.mileposts);
    if (!currentTrack) {
      return; // Not on track
    }

    // Check authority boundaries
    if (this.activeAuthority) {
      this.checkBoundaryProximity(currentTrack);
    }

    // Check nearby authorities
    this.checkAuthorityProximity(currentTrack);

    this.lastPosition = { latitude, longitude, track: currentTrack };
  }

  checkBoundaryProximity(currentTrack) {
    const { milepost } = currentTrack;
    const beginMP = parseFloat(this.activeAuthority.Begin_Milepost);
    const endMP = parseFloat(this.activeAuthority.End_Milepost);

    // Calculate distance to boundaries
    const distanceToBegin = Math.abs(milepost - beginMP);
    const distanceToEnd = Math.abs(milepost - endMP);

    // Check if approaching begin boundary
    if (milepost < beginMP) {
      this.triggerBoundaryAlert('begin', distanceToBegin);
    }

    // Check if approaching end boundary
    if (milepost > endMP) {
      this.triggerBoundaryAlert('end', distanceToEnd);
    }

    // Check if within boundaries but approaching edge
    if (milepost >= beginMP && milepost <= endMP) {
      if (distanceToBegin < ALERT_DISTANCES.EMERGENCY) {
        this.triggerProximityAlert('boundary_begin', distanceToBegin, 'emergency');
      } else if (distanceToBegin < ALERT_DISTANCES.CRITICAL) {
        this.triggerProximityAlert('boundary_begin', distanceToBegin, 'critical');
      }

      if (distanceToEnd < ALERT_DISTANCES.EMERGENCY) {
        this.triggerProximityAlert('boundary_end', distanceToEnd, 'emergency');
      } else if (distanceToEnd < ALERT_DISTANCES.CRITICAL) {
        this.triggerProximityAlert('boundary_end', distanceToEnd, 'critical');
      }
    }
  }

  checkAuthorityProximity(currentTrack) {
    if (!this.nearbyAuthorities || this.nearbyAuthorities.length === 0) {
      return;
    }

    this.nearbyAuthorities.forEach((authority) => {
      // Skip if same track type/number
      if (authority.Track_Type !== currentTrack.trackType || 
          authority.Track_Number !== currentTrack.trackNumber) {
        return;
      }

      const distance = calculateTrackDistance(
        currentTrack.milepost,
        (parseFloat(authority.Begin_Milepost) + parseFloat(authority.End_Milepost)) / 2,
        this.mileposts
      );

      // Determine alert level based on distance
      let alertLevel = null;
      if (distance <= ALERT_DISTANCES.EMERGENCY) {
        alertLevel = 'emergency';
      } else if (distance <= ALERT_DISTANCES.CRITICAL) {
        alertLevel = 'critical';
      } else if (distance <= ALERT_DISTANCES.WARNING) {
        alertLevel = 'warning';
      } else if (distance <= ALERT_DISTANCES.INFORMATIONAL) {
        alertLevel = 'informational';
      }

      if (alertLevel) {
        this.triggerProximityAlert(
          `authority_${authority.Authority_ID}`,
          distance,
          alertLevel,
          {
            type: 'authority',
            employeeName: authority.Employee_Name,
            employeeContact: authority.Employee_Contact,
            milepostRange: `MP ${authority.Begin_Milepost}-${authority.End_Milepost}`,
          }
        );
      }
    });
  }

  triggerBoundaryAlert(boundary, distance) {
    const alertKey = `boundary_${boundary}_${Math.floor(distance * 100)}`;
    
    if (this.hasRecentAlert(alertKey)) {
      return; // Don't spam
    }

    let level = 'informational';
    if (distance <= ALERT_DISTANCES.EMERGENCY) level = 'emergency';
    else if (distance <= ALERT_DISTANCES.CRITICAL) level = 'critical';
    else if (distance <= ALERT_DISTANCES.WARNING) level = 'warning';

    const message = `Approaching ${boundary === 'begin' ? 'BEGIN' : 'END'} milepost (${distance.toFixed(2)} mi)`;

    this.sendAlert(alertKey, level, 'Boundary Alert', message);
  }

  triggerProximityAlert(key, distance, level, metadata = {}) {
    const alertKey = `${key}_${level}`;
    
    if (this.hasRecentAlert(alertKey)) {
      return;
    }

    let title = 'Proximity Alert';
    let message = `${distance.toFixed(2)} miles away`;

    if (metadata.type === 'authority') {
      title = '⚠️ Worker Nearby';
      message = `${metadata.employeeName} (${metadata.employeeContact})\n${metadata.milepostRange}\nDistance: ${distance.toFixed(2)} mi`;
    }

    this.sendAlert(alertKey, level, title, message);
  }

  async sendAlert(key, level, title, message) {
    // Record alert
    this.alertHistory.set(key, Date.now());

    // Play sound
    await this.playAlertSound(level);

    // Trigger haptic feedback
    await this.triggerHaptics(level);

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: true,
        priority: level === 'emergency' || level === 'critical' ? 'high' : 'default',
        color: this.getAlertColor(level),
      },
      trigger: null, // Immediate
    });

    // Emit event for UI updates
    if (this.onAlert) {
      this.onAlert({ key, level, title, message, timestamp: new Date().toISOString() });
    }
  }

  async playAlertSound(level) {
    try {
      const sound = this.alertSounds[level];
      if (sound && sound.sound) {
        await sound.sound.replayAsync();
      }
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  async triggerHaptics(level) {
    try {
      switch (level) {
        case 'emergency':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }, 300);
          break;
        case 'critical':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'warning':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Could not trigger haptics:', error);
    }
  }

  hasRecentAlert(key) {
    const lastAlert = this.alertHistory.get(key);
    if (!lastAlert) return false;

    const timeSinceAlert = Date.now() - lastAlert;
    const cooldown = 30000; // 30 seconds cooldown

    return timeSinceAlert < cooldown;
  }

  getAlertColor(level) {
    switch (level) {
      case 'emergency': return COLORS.alertEmergency;
      case 'critical': return COLORS.alertCritical;
      case 'warning': return COLORS.alertWarning;
      default: return COLORS.alertInformational;
    }
  }

  // Set callback for alert events
  setAlertCallback(callback) {
    this.onAlert = callback;
  }

  // Clean up
  async cleanup() {
    this.stopMonitoring();
    
    // Unload sounds
    for (const key in this.alertSounds) {
      if (this.alertSounds[key] && this.alertSounds[key].sound) {
        await this.alertSounds[key].sound.unloadAsync();
      }
    }
  }
}

export default new ProximityAlertService();
