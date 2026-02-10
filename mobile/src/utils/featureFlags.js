/**
 * Feature Flags System
 * Allows remote configuration and quick feature toggles for iOS/Android
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api/ApiService';
import logger from './logger';

const FEATURE_FLAGS_KEY = '@herzog_feature_flags';
const FLAGS_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

class FeatureFlags {
  constructor() {
    this.flags = {
      // Background tracking
      backgroundTracking: true,
      backgroundGPSInterval: 5000, // 5 seconds
      
      // Alert thresholds (in miles)
      boundaryAlerts: {
        enabled: true,
        distances: [0.25, 0.5, 0.75, 1.0],
      },
      proximityAlerts: {
        enabled: true,
        distances: [0.25, 0.5, 0.75, 1.0],
      },
      
      // GPS settings
      gpsHighAccuracy: true,
      gpsDistanceFilter: 10, // meters
      gpsUpdateInterval: 3000, // 3 seconds
      gpsSmoothingEnabled: true,
      gpsSmoothingWindow: 5, // Average last 5 readings
      
      // Offline mode
      offlineMode: {
        enabled: true,
        autoSync: true,
        syncInterval: 60000, // 1 minute
      },
      
      // UI features
      showDebugInfo: false,
      showGPSAccuracy: true,
      showOfflineIndicator: true,
      
      // Notifications
      localNotifications: true,
      pushNotifications: true,
      
      // Safety features
      requireConfirmationToEndAuthority: true,
      autoStopTrackingOnClear: true,
      
      // Map features
      followMeMode: true,
      showOtherWorkers: true,
      clusterMarkers: true,
    };
    
    this.lastFetch = null;
    this.loadFromCache();
  }

  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(FEATURE_FLAGS_KEY);
      if (cached) {
        const { flags, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < FLAGS_CACHE_DURATION) {
          this.flags = { ...this.flags, ...flags };
          this.lastFetch = timestamp;
          logger.info('FeatureFlags', 'Loaded from cache', { flagCount: Object.keys(flags).length });
        }
      }
    } catch (error) {
      logger.error('FeatureFlags', 'Failed to load from cache', error);
    }
  }

  async saveToCache() {
    try {
      await AsyncStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify({
        flags: this.flags,
        timestamp: Date.now(),
      }));
    } catch (error) {
      logger.error('FeatureFlags', 'Failed to save to cache', error);
    }
  }

  /**
   * Fetch feature flags from server
   * Falls back to defaults if fetch fails
   */
  async fetchFromServer(force = false) {
    try {
      // Don't re-fetch if cache is still valid
      if (!force && this.lastFetch && Date.now() - this.lastFetch < FLAGS_CACHE_DURATION) {
        logger.info('FeatureFlags', 'Using cached flags');
        return this.flags;
      }

      logger.info('FeatureFlags', 'Fetching from server');
      
      const response = await apiService.api.get('/config/feature-flags');
      
      if (response.data && response.data.flags) {
        this.flags = { ...this.flags, ...response.data.flags };
        this.lastFetch = Date.now();
        await this.saveToCache();
        logger.info('FeatureFlags', 'Updated from server', { flagCount: Object.keys(response.data.flags).length });
      }

      return this.flags;
    } catch (error) {
      // Silently fail and use defaults/cached values
      logger.warn('FeatureFlags', 'Failed to fetch from server, using defaults/cache', error);
      return this.flags;
    }
  }

  /**
   * Get a specific feature flag
   */
  get(flagPath) {
    const parts = flagPath.split('.');
    let value = this.flags;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        logger.warn('FeatureFlags', `Flag not found: ${flagPath}`);
        return null;
      }
    }
    
    return value;
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagPath) {
    const value = this.get(flagPath);
    return value === true;
  }

  /**
   * Set a flag value (for testing/emergency override)
   */
  async set(flagPath, value) {
    const parts = flagPath.split('.');
    let target = this.flags;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in target)) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }
    
    target[parts[parts.length - 1]] = value;
    await this.saveToCache();
    logger.info('FeatureFlags', `Set ${flagPath} = ${value}`);
  }

  /**
   * Get all flags
   */
  getAll() {
    return { ...this.flags };
  }

  /**
   * Reset to defaults
   */
  async reset() {
    await AsyncStorage.removeItem(FEATURE_FLAGS_KEY);
    this.lastFetch = null;
    logger.info('FeatureFlags', 'Reset to defaults');
  }
}

// Export singleton instance
const featureFlags = new FeatureFlags();

// Auto-fetch on initialization (but don't await)
featureFlags.fetchFromServer().catch(() => {});

export default featureFlags;
