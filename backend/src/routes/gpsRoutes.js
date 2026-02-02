const express = require('express');
const router = express.Router();
const gpsController = require('../controllers/gpsController');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All GPS routes require authentication
router.use(auth);

// Update GPS position
router.post('/update', validate(schemas.gpsUpdate), gpsController.updatePosition);

// Get user's current position
router.get('/my-position', gpsController.getMyPosition);

// Get all active positions (supervisors and admins only)
router.get('/active-positions', gpsController.getAllActivePositions);

module.exports = router;
