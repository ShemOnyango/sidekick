const express = require('express');
const router = express.Router();
const proximityController = require('../controllers/proximityController');
const { auth } = require('../middleware/auth');

// Get proximity status for an authority
router.get('/status/:authorityId', auth, proximityController.getProximityStatus);

// Get proximity monitoring service status
router.get('/service-status', auth, proximityController.getServiceStatus);

module.exports = router;
