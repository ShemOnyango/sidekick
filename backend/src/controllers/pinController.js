const Pin = require('../models/Pin');
const { logger } = require('../config/logger');
const { getConnection, sql } = require('../config/database');

class PinController {
  async createPin(req, res) {
    try {
      const user = req.user;
      const {
        authorityId,
        pinTypeId,
        latitude,
        longitude,
        trackType = null,
        trackNumber = null,
        mp = null,
        notes = null,
        photoUrl = null
      } = req.body;

      if (!authorityId || !pinTypeId || !latitude || !longitude) {
        return res.status(400).json({ success: false, error: 'Missing required pin fields' });
      }

      // TODO: verify authority belongs to user's agency or user (authorization checks)

      const created = await Pin.create({
        authorityId,
        pinTypeId,
        latitude,
        longitude,
        trackType,
        trackNumber,
        mp,
        notes,
        photoUrl
      });

      logger.info(`Pin created by user ${user.User_ID} for authority ${authorityId}`);

      res.json({ success: true, data: created });
    } catch (error) {
      logger.error('Create pin error:', error);
      res.status(500).json({ success: false, error: 'Failed to create pin' });
    }
  }

  async getPinsByAuthority(req, res) {
    try {
      const { authorityId } = req.params;
      const user = req.user;

      if (!authorityId) {
        return res.status(400).json({ success: false, error: 'Authority ID required' });
      }

      const pins = await Pin.getAuthorityPins(authorityId);
      res.json({ success: true, data: pins });
    } catch (error) {
      logger.error('Get pins error:', error);
      res.status(500).json({ success: false, error: 'Failed to get pins' });
    }
  }

  async getTripPins(req, res) {
    try {
      const { authorityId } = req.params;
      if (!authorityId) { return res.status(400).json({ success: false, error: 'Authority ID required' }); }

      const pins = await Pin.getTripReport(authorityId);
      res.json({ success: true, data: pins });
    } catch (error) {
      logger.error('Get trip pins error:', error);
      res.status(500).json({ success: false, error: 'Failed to get trip pins' });
    }
  }
}

module.exports = new PinController();
