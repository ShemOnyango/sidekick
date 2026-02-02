// mobile/src/services/maps/MapboxService.js
// import MapboxGL from '@rnmapbox/maps'; // DISABLED
import { Platform } from 'react-native';
// import RNFS from 'react-native-fs'; // DISABLED
// import { unzip } from 'react-native-zip-archive'; // DISABLED
import databaseService from '../database/DatabaseService';
import { CONFIG } from '../../constants/config';
import apiService from '../api/ApiService';

// TEMPORARY: Commenting out to test if this causes the error
console.log('⚠️ MapboxGL.setAccessToken DISABLED for debugging');
// MapboxGL.setAccessToken(CONFIG.MAP.MAPBOX_TOKEN);

class MapboxService {
  constructor() {
    this.offlinePacks = new Map();
    this.isInitialized = false;
    this.currentStyle = 'mapbox://styles/mapbox/satellite-streets-v11';
  }

  async initialize() {
    try {
      // TEMPORARY: Commenting out to test if this causes the error
      console.log('⚠️ MapboxService initialization DISABLED for debugging');
      // MapboxGL.setTelemetryEnabled(false);
      // MapboxGL.setMaximumCacheSize(500 * 1024 * 1024); // 500MB
      
      this.isInitialized = true;
      console.log('Mapbox service initialized (DEBUG MODE)');
      return true;
    } catch (error) {
      console.error('Failed to initialize Mapbox:', error);
      return false;
    }
  }

  async downloadOfflineMap(region, options = {}) {
    try {
      const { 
        name = 'offline_map',
        styleURL = this.currentStyle,
        minZoom = 10,
        maxZoom = 16,
        bounds 
      } = options;

      // Check if pack already exists
      const existingPacks = await MapboxGL.offlineManager.getPacks();
      const existingPack = existingPacks.find(pack => pack.name === name);
      
      if (existingPack) {
        console.log('Offline pack already exists:', name);
        return existingPack;
      }

      // Calculate bounds if not provided
      const downloadBounds = bounds || this.calculateBounds(region);

      // Create offline pack definition
      const packOptions = {
        name,
        styleURL,
        bounds: downloadBounds,
        minZoom,
        maxZoom,
        metadata: {
          region: JSON.stringify(region),
          downloadedAt: new Date().toISOString(),
          sizeEstimate: this.estimateDownloadSize(downloadBounds, minZoom, maxZoom),
        },
      };

      console.log('Starting offline map download:', packOptions);

      // Start download
      const offlinePack = await MapboxGL.offlineManager.createPack(packOptions, this.downloadProgressHandler);

      // Store reference
      this.offlinePacks.set(name, offlinePack);

      // Listen for download events
      offlinePack.subscribe('progress', (pack, status) => {
        console.log(`Download progress for ${name}:`, status);
        this.handleDownloadProgress(name, status);
      });

      offlinePack.subscribe('error', (pack, error) => {
        console.error(`Download error for ${name}:`, error);
        this.handleDownloadError(name, error);
      });

      offlinePack.subscribe('maximumTiles', (pack, maximumTiles) => {
        console.warn(`Maximum tiles reached for ${name}:`, maximumTiles);
      });

      return offlinePack;
    } catch (error) {
      console.error('Failed to download offline map:', error);
      throw error;
    }
  }

  downloadProgressHandler = (offlineRegion, status) => {
    // This handler is called during download
    const { name } = offlineRegion;
    console.log(`Download ${name}: ${status.percentage}% complete`);
    
    // Update download progress in database
    this.updateDownloadProgress(name, status);
  };

  async updateDownloadProgress(packName, status) {
    try {
      await databaseService.updateOfflineDownloadProgress(packName, {
        percentage: status.percentage,
        completedResourceCount: status.completedResourceCount,
        completedResourceSize: status.completedResourceSize,
        totalResourceCount: status.totalResourceCount,
        totalResourceSize: status.totalResourceSize,
      });
    } catch (error) {
      console.error('Failed to update download progress:', error);
    }
  }

  handleDownloadProgress(packName, status) {
    // Emit progress events to UI
    // You can use Redux or Context to update UI
    console.log(`Pack ${packName} progress:`, status);
  }

  handleDownloadError(packName, error) {
    console.error(`Pack ${packName} error:`, error);
    
    // Update database with error
    databaseService.updateOfflineDownloadError(packName, error.message);
  }

  calculateBounds(region) {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    
    return [
      [longitude - longitudeDelta / 2, latitude - latitudeDelta / 2], // Southwest
      [longitude + longitudeDelta / 2, latitude + latitudeDelta / 2], // Northeast
    ];
  }

  estimateDownloadSize(bounds, minZoom, maxZoom) {
    // Simple estimation based on bounds and zoom levels
    const area = this.calculateArea(bounds);
    const zoomLevels = maxZoom - minZoom + 1;
    
    // Rough estimate: 0.1 MB per zoom level per unit area
    return Math.round(area * zoomLevels * 0.1 * 1024 * 1024); // in bytes
  }

  calculateArea(bounds) {
    const [sw, ne] = bounds;
    const width = Math.abs(ne[0] - sw[0]);
    const height = Math.abs(ne[1] - sw[1]);
    return width * height;
  }

  async getOfflinePacks() {
    try {
      const packs = await MapboxGL.offlineManager.getPacks();
      return packs;
    } catch (error) {
      console.error('Failed to get offline packs:', error);
      return [];
    }
  }

  async deleteOfflinePack(packName) {
    try {
      await MapboxGL.offlineManager.deletePack(packName);
      this.offlinePacks.delete(packName);
      console.log(`Deleted offline pack: ${packName}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete offline pack ${packName}:`, error);
      return false;
    }
  }

  async pauseDownload(packName) {
    try {
      const pack = this.offlinePacks.get(packName);
      if (pack) {
        await pack.pause();
        console.log(`Paused download: ${packName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to pause download ${packName}:`, error);
      return false;
    }
  }

  async resumeDownload(packName) {
    try {
      const pack = this.offlinePacks.get(packName);
      if (pack) {
        await pack.resume();
        console.log(`Resumed download: ${packName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to resume download ${packName}:`, error);
      return false;
    }
  }

  async getDownloadStatus(packName) {
    try {
      const pack = this.offlinePacks.get(packName);
      if (pack) {
        const status = await pack.getStatus();
        return status;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get download status for ${packName}:`, error);
      return null;
    }
  }

  async downloadTrackData(agencyId, subdivisionId) {
    try {
      // Get track geometry data from server
      const trackData = await this.fetchTrackData(agencyId, subdivisionId);
      
      // Save to local database
      await databaseService.saveTrackData(trackData);
      
      // Download custom map tiles for the area
      const region = this.calculateRegionFromTracks(trackData);
      await this.downloadOfflineMap(region, {
        name: `tracks_${agencyId}_${subdivisionId}`,
        minZoom: 12,
        maxZoom: 18,
      });
      
      console.log(`Track data downloaded for subdivision ${subdivisionId}`);
      return true;
    } catch (error) {
      console.error('Failed to download track data:', error);
      throw error;
    }
  }

  async fetchTrackData(agencyId, subdivisionId) {
    try {
      console.log(`Fetching track data for agency ${agencyId}, subdivision ${subdivisionId}`);
      const response = await apiService.downloadSubdivisionData(subdivisionId);

      if (!response || !response.success) {
        console.warn('No track data returned from server');
        return [];
      }

      const data = response.data || {};

      // Persist tracks and milepost geometry into local DB
      if (Array.isArray(data.tracks)) {
        for (const t of data.tracks) {
          try {
            await databaseService.saveOfflineData('tracks', t);
          } catch (err) {
            console.error('Failed to save track to DB:', err, t);
          }
        }
      }

      if (Array.isArray(data.milepost_geometry)) {
        for (const mp of data.milepost_geometry) {
          try {
            await databaseService.saveOfflineData('milepost_geometry', mp);
          } catch (err) {
            console.error('Failed to save milepost to DB:', err, mp);
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch track data:', error);
      return [];
    }
  }

  calculateRegionFromTracks(trackData) {
    if (!trackData || trackData.length === 0) {
      return {
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 50,
        longitudeDelta: 50,
      };
    }

    // Calculate bounds from track coordinates
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    trackData.forEach(track => {
      if (track.Latitude && track.Longitude) {
        minLat = Math.min(minLat, track.Latitude);
        maxLat = Math.max(maxLat, track.Latitude);
        minLng = Math.min(minLng, track.Longitude);
        maxLng = Math.max(maxLng, track.Longitude);
      }
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.2; // Add 20% padding
    const lngDelta = (maxLng - minLng) * 1.2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  }

  async loadCustomStyle(styleURL) {
    try {
      this.currentStyle = styleURL;
      return true;
    } catch (error) {
      console.error('Failed to load custom style:', error);
      return false;
    }
  }

  async addTrackLayer(map, trackData) {
    try {
      // Add track line layer
      map.addSource('tracks', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: trackData.map(track => ({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: this.convertTrackToCoordinates(track),
            },
            properties: {
              trackType: track.Track_Type,
              trackNumber: track.Track_Number,
              bmp: track.BMP,
              emp: track.EMP,
            },
          })),
        },
      });

      map.addLayer({
        id: 'tracks-line',
        type: 'line',
        source: 'tracks',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'trackType'],
            'Main', '#FFD100',
            'Yard', '#4CAF50',
            'Siding', '#2196F3',
            '#9C27B0' // default
          ],
          'line-width': [
            'match',
            ['get', 'trackType'],
            'Main', 4,
            'Yard', 3,
            'Siding', 2,
            1
          ],
          'line-opacity': 0.8,
        },
      });

      // Add milepost markers
      map.addLayer({
        id: 'mileposts',
        type: 'symbol',
        source: 'tracks',
        layout: {
          'text-field': ['get', 'bmp'],
          'text-size': 12,
          'text-offset': [0, 1.5],
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });

      console.log('Track layers added to map');
      return true;
    } catch (error) {
      console.error('Failed to add track layer:', error);
      return false;
    }
  }

  convertTrackToCoordinates(track) {
    // Convert track data to GeoJSON coordinates
    // This would depend on your track data structure
    return [[track.Longitude, track.Latitude]];
  }

  async cleanup() {
    try {
      // Cancel all downloads
      for (const [name, pack] of this.offlinePacks) {
        await pack.cancel();
      }
      this.offlinePacks.clear();
      console.log('Mapbox service cleaned up');
    } catch (error) {
      console.error('Error cleaning up Mapbox service:', error);
    }
  }
}

// Export singleton instance
const mapboxService = new MapboxService();
export default mapboxService;
