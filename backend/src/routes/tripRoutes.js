const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { auth } = require('../middleware/auth');

// Protect routes
router.use(auth);

router.post('/generate/:authorityId', tripController.generateTripReport);
router.get('/history', tripController.getTripHistory);

module.exports = router;
