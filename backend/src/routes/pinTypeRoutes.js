const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const pinTypeController = require('../controllers/pinTypeController');

// Get pin types for an agency
router.get('/agencies/:agencyId/pin-types', auth, pinTypeController.getPinTypes);

// Get pin categories for an agency
router.get('/agencies/:agencyId/pin-types/categories', auth, pinTypeController.getPinCategories);

// Create a new pin type (Admin only)
router.post('/agencies/:agencyId/pin-types', auth, pinTypeController.createPinType);

// Update a pin type (Admin only)
router.put('/agencies/:agencyId/pin-types/:pinTypeId', auth, pinTypeController.updatePinType);

// Delete a pin type (Admin only)
router.delete('/agencies/:agencyId/pin-types/:pinTypeId', auth, pinTypeController.deletePinType);

module.exports = router;
