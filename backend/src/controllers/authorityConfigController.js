const { logger } = require('../config/logger');

/**
 * Get authority field configurations for an agency
 */
const getAuthorityFieldConfigurations = async (req, res) => {
  try {
    const { agencyId } = req.params;

    // Check authorization - handle both Agency_ID and agencyId field names
    const userAgencyId = req.user.Agency_ID || req.user.agencyId;
    if (req.user.role !== 'Administrator' && userAgencyId !== parseInt(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Default field configurations
    const defaultFields = {
      authorityType: {
        label: 'Authority Type',
        required: true,
        enabled: true,
        options: [
          'Foul Time',
          'Maintenance Window',
          'Emergency Work',
          'Inspection',
          'Construction',
          'Signal Work',
          'Track Work',
          'Other'
        ]
      },
      subdivision: {
        label: 'Subdivision',
        required: true,
        enabled: true
      },
      beginMP: {
        label: 'Begin Milepost',
        required: true,
        enabled: true,
        format: 'decimal',
        minValue: 0
      },
      endMP: {
        label: 'End Milepost',
        required: true,
        enabled: true,
        format: 'decimal',
        minValue: 0
      },
      trackType: {
        label: 'Track Type',
        required: true,
        enabled: true,
        options: ['Main', 'Siding', 'Yard', 'Industrial', 'Other']
      },
      trackNumber: {
        label: 'Track Number',
        required: true,
        enabled: true,
        format: 'text'
      },
      employeeName: {
        label: 'Employee Name',
        required: false,
        enabled: true,
        format: 'text'
      },
      employeeContact: {
        label: 'Employee Contact',
        required: false,
        enabled: true,
        format: 'phone'
      },
      expirationTime: {
        label: 'Expiration Time',
        required: false,
        enabled: true,
        format: 'datetime'
      },
      notes: {
        label: 'Notes',
        required: false,
        enabled: true,
        format: 'textarea',
        maxLength: 1000
      },
      equipment: {
        label: 'Equipment',
        required: false,
        enabled: false,
        format: 'text'
      },
      workDescription: {
        label: 'Work Description',
        required: false,
        enabled: false,
        format: 'textarea',
        maxLength: 500
      },
      speedRestriction: {
        label: 'Speed Restriction (MPH)',
        required: false,
        enabled: false,
        format: 'number',
        minValue: 0,
        maxValue: 150
      }
    };

    // In a production system, this would be stored in the database
    // For now, we return the default configuration
    res.json({
      success: true,
      data: {
        fieldConfigurations: defaultFields,
        customFields: []
      }
    });
  } catch (error) {
    logger.error('Error getting authority field configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve field configurations',
      error: error.message
    });
  }
};

/**
 * Update authority field configurations
 */
const updateAuthorityFieldConfigurations = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { fieldConfigurations } = req.body;

    // Only administrators can update field configurations
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update field configurations'
      });
    }

    if (!fieldConfigurations || typeof fieldConfigurations !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Field configurations object is required'
      });
    }

    // Validate that required fields cannot be disabled
    const requiredFields = ['authorityType', 'subdivision', 'beginMP', 'endMP', 'trackType', 'trackNumber'];
    for (const field of requiredFields) {
      if (fieldConfigurations[field] && !fieldConfigurations[field].enabled) {
        return res.status(400).json({
          success: false,
          message: `Cannot disable required field: ${field}`
        });
      }
    }

    // In production, this would save to a database table
    // For now, we'll log the update and return success
    logger.info(`Authority field configurations updated for agency ${agencyId} by user ${req.user.userId}`);

    res.json({
      success: true,
      data: {
        fieldConfigurations
      },
      message: 'Field configurations updated successfully'
    });
  } catch (error) {
    logger.error('Error updating authority field configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update field configurations',
      error: error.message
    });
  }
};

/**
 * Get authority type options for an agency
 */
const getAuthorityTypeOptions = async (req, res) => {
  try {
    const { agencyId } = req.params;

    // Check authorization
    if (req.user.role !== 'Administrator' && req.user.agencyId !== parseInt(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const defaultTypes = [
      { value: 'Foul Time', label: 'Foul Time', color: '#FF5733' },
      { value: 'Maintenance Window', label: 'Maintenance Window', color: '#FFC300' },
      { value: 'Emergency Work', label: 'Emergency Work', color: '#C70039' },
      { value: 'Inspection', label: 'Inspection', color: '#3498DB' },
      { value: 'Construction', label: 'Construction', color: '#F39C12' },
      { value: 'Signal Work', label: 'Signal Work', color: '#9B59B6' },
      { value: 'Track Work', label: 'Track Work', color: '#27AE60' },
      { value: 'Other', label: 'Other', color: '#95A5A6' }
    ];

    res.json({
      success: true,
      data: {
        authorityTypes: defaultTypes
      }
    });
  } catch (error) {
    logger.error('Error getting authority type options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve authority type options',
      error: error.message
    });
  }
};

/**
 * Add custom authority type option
 */
const addAuthorityTypeOption = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { value, label, color } = req.body;

    // Only administrators can add authority types
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can add authority types'
      });
    }

    if (!value || !label || !color) {
      return res.status(400).json({
        success: false,
        message: 'Value, label, and color are required'
      });
    }

    // Validate color format
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Color must be in hex format (e.g., #FF5733)'
      });
    }

    // In production, this would be saved to database
    logger.info(`Authority type added for agency ${agencyId}: ${value} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      data: {
        authorityType: { value, label, color }
      },
      message: 'Authority type added successfully'
    });
  } catch (error) {
    logger.error('Error adding authority type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add authority type',
      error: error.message
    });
  }
};

/**
 * Get validation rules for authority fields
 */
const getAuthorityValidationRules = async (req, res) => {
  try {
    const { agencyId } = req.params;

    // Check authorization
    if (req.user.role !== 'Administrator' && req.user.agencyId !== parseInt(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const validationRules = {
      beginMP: {
        type: 'number',
        min: 0,
        max: 9999.99,
        decimalPlaces: 2,
        required: true
      },
      endMP: {
        type: 'number',
        min: 0,
        max: 9999.99,
        decimalPlaces: 2,
        required: true,
        validation: 'must be greater than Begin MP'
      },
      trackNumber: {
        type: 'string',
        maxLength: 10,
        pattern: '^[A-Za-z0-9-]+$',
        required: true
      },
      employeeContact: {
        type: 'string',
        pattern: '^[0-9]{3}-[0-9]{3}-[0-9]{4}$',
        format: 'phone',
        example: '555-123-4567'
      },
      speedRestriction: {
        type: 'number',
        min: 0,
        max: 150,
        unit: 'MPH'
      },
      expirationTime: {
        type: 'datetime',
        validation: 'must be in the future'
      }
    };

    res.json({
      success: true,
      data: {
        validationRules
      }
    });
  } catch (error) {
    logger.error('Error getting validation rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve validation rules',
      error: error.message
    });
  }
};

module.exports = {
  getAuthorityFieldConfigurations,
  updateAuthorityFieldConfigurations,
  getAuthorityTypeOptions,
  addAuthorityTypeOption,
  getAuthorityValidationRules
};
