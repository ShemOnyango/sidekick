const logger = require('../config/logger').logger;
const proximityMonitoringService = require('../services/proximityMonitoringService');

/**
 * Get proximity status for an authority
 */
const getProximityStatus = async (req, res) => {
  try {
    const { authorityId } = req.params;

    if (!authorityId) {
      return res.status(400).json({
        success: false,
        error: 'Authority ID is required'
      });
    }

    const status = await proximityMonitoringService.getProximityStatus(authorityId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting proximity status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get proximity status'
    });
  }
};

/**
 * Get proximity monitoring service status
 */
const getServiceStatus = async (req, res) => {
  try {
    const isRunning = proximityMonitoringService.monitoringInterval !== null;

    res.json({
      success: true,
      data: {
        isRunning,
        checkInterval: 30000, // 30 seconds
        distanceThresholds: [
          { distance: 0.25, level: 'Critical' },
          { distance: 0.5, level: 'Warning' },
          { distance: 0.75, level: 'Warning' },
          { distance: 1.0, level: 'Info' }
        ]
      }
    });
  } catch (error) {
    logger.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get service status'
    });
  }
};

module.exports = {
  getProximityStatus,
  getServiceStatus
};
