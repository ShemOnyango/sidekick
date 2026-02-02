const pinTypeModel = require('../models/PinType');
const { logger } = require('../config/logger');

/**
 * Get all pin types for an agency
 */
const getPinTypes = async (req, res) => {
  try {
    const { agencyId } = req.params;

    // Check authorization - users can only view their agency's pin types
    if (req.user.Role !== 'Administrator' && req.user.Agency_ID !== parseInt(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this agency\'s pin types'
      });
    }

    const pinTypes = await pinTypeModel.findByAgency(agencyId);

    res.json({
      success: true,
      data: {
        pinTypes: pinTypes,
        total: pinTypes.length
      }
    });
  } catch (error) {
    logger.error('Error getting pin types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pin types',
      error: error.message
    });
  }
};

/**
 * Create a new pin type
 */
const createPinType = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { category, subtype, color, iconUrl, sortOrder } = req.body;

    // Only administrators can create pin types
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create pin types'
      });
    }

    // Validate required fields
    if (!category || !subtype || !color) {
      return res.status(400).json({
        success: false,
        message: 'Category, subtype, and color are required'
      });
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Color must be in hex format (e.g., #FF5733)'
      });
    }

    const newPinType = await pinTypeModel.create({
      agencyId,
      pinCategory: category,
      pinSubtype: subtype,
      color,
      iconUrl,
      sortOrder: sortOrder || 0
    });

    logger.info(`Pin type created: ${newPinType.Pin_Type_ID} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      data: {
        pinType: {
          pinTypeId: newPinType.Pin_Type_ID,
          category: newPinType.Pin_Category,
          subtype: newPinType.Pin_Subtype,
          color: newPinType.Color,
          iconUrl: newPinType.Icon_URL,
          sortOrder: newPinType.Sort_Order
        }
      },
      message: 'Pin type created successfully'
    });
  } catch (error) {
    logger.error('Error creating pin type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pin type',
      error: error.message
    });
  }
};

/**
 * Update a pin type
 */
const updatePinType = async (req, res) => {
  try {
    const { pinTypeId } = req.params;
    const { category, subtype, color, iconUrl, sortOrder, isActive } = req.body;

    // Only administrators can update pin types
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update pin types'
      });
    }

    // Validate color format if provided
    if (color) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!hexColorRegex.test(color)) {
        return res.status(400).json({
          success: false,
          message: 'Color must be in hex format (e.g., #FF5733)'
        });
      }
    }

    const updateData = {};
    if (category !== undefined) {
      updateData.Pin_Category = category;
    }
    if (subtype !== undefined) {
      updateData.Pin_Subtype = subtype;
    }
    if (color !== undefined) {
      updateData.Color = color;
    }
    if (iconUrl !== undefined) {
      updateData.Icon_URL = iconUrl;
    }
    if (sortOrder !== undefined) {
      updateData.Sort_Order = sortOrder;
    }
    if (isActive !== undefined) {
      updateData.Is_Active = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updatedPinType = await pinTypeModel.update(pinTypeId, updateData);

    if (!updatedPinType) {
      return res.status(404).json({
        success: false,
        message: 'Pin type not found'
      });
    }

    logger.info(`Pin type updated: ${pinTypeId} by user ${req.user.userId}`);

    res.json({
      success: true,
      data: {
        pinType: {
          pinTypeId: updatedPinType.Pin_Type_ID,
          category: updatedPinType.Pin_Category,
          subtype: updatedPinType.Pin_Subtype,
          color: updatedPinType.Color,
          iconUrl: updatedPinType.Icon_URL,
          sortOrder: updatedPinType.Sort_Order,
          isActive: updatedPinType.Is_Active
        }
      },
      message: 'Pin type updated successfully'
    });
  } catch (error) {
    logger.error('Error updating pin type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pin type',
      error: error.message
    });
  }
};

/**
 * Delete (soft delete) a pin type
 */
const deletePinType = async (req, res) => {
  try {
    const { pinTypeId } = req.params;

    // Only administrators can delete pin types
    if (req.user.role !== 'Administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete pin types'
      });
    }

    // Soft delete by setting Is_Active to false
    const result = await pinTypeModel.update(pinTypeId, { Is_Active: false });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Pin type not found'
      });
    }

    logger.info(`Pin type deleted: ${pinTypeId} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Pin type deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting pin type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pin type',
      error: error.message
    });
  }
};

/**
 * Get pin type categories for an agency
 */
const getPinCategories = async (req, res) => {
  try {
    const { agencyId } = req.params;

    // Check authorization
    if (req.user.Role !== 'Administrator' && req.user.Agency_ID !== parseInt(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const pinTypes = await pinTypeModel.findByAgency(agencyId);

    // Extract unique categories
    const categories = [...new Set(pinTypes.map(pt => pt.Pin_Category))];

    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    logger.error('Error getting pin categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pin categories',
      error: error.message
    });
  }
};

module.exports = {
  getPinTypes,
  createPinType,
  updatePinType,
  deletePinType,
  getPinCategories
};
