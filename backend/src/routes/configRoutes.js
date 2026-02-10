const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const featureFlagsController = require('../controllers/featureFlagsController');

// Get feature flags (public endpoint for mobile apps)
router.get('/feature-flags', featureFlagsController.getFeatureFlags);

// Update feature flags (Admin only)
router.put('/feature-flags', auth, authorize('Administrator'), featureFlagsController.updateFeatureFlags);

module.exports = router;
