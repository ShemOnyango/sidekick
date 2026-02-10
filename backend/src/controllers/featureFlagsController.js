/**
 * Feature Flags Controller
 * Provides remote configuration for mobile app features
 */

/**
 * Get feature flags for mobile app
 * GET /config/feature-flags
 */
exports.getFeatureFlags = async (req, res) => {
  try {
    // Feature flags configuration
    // These can be stored in database for dynamic updates
    const flags = {
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

    res.json({
      success: true,
      flags,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get feature flags error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get feature flags' 
    });
  }
};

/**
 * Update feature flags (Admin only)
 * PUT /config/feature-flags
 * Body: { flags: {...} }
 */
exports.updateFeatureFlags = async (req, res) => {
  try {
    const { flags } = req.body;

    // TODO: Store flags in database for persistence
    // For now, just validate the request
    if (!flags || typeof flags !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid flags object',
      });
    }

    // In a real implementation, save to database here
    // await db.request()
    //   .input('Flags', db.sql.NVarChar, JSON.stringify(flags))
    //   .query('UPDATE System_Config SET Feature_Flags = @Flags WHERE Config_ID = 1');

    res.json({
      success: true,
      message: 'Feature flags updated successfully',
      flags,
    });
  } catch (error) {
    console.error('Update feature flags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flags',
    });
  }
};
