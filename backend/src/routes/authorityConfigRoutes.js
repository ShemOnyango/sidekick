const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authorityConfigController = require('../controllers/authorityConfigController');

// Get authority field configurations
router.get('/agencies/:agencyId/authority-config/fields', auth, authorityConfigController.getAuthorityFieldConfigurations);

// Update authority field configurations (Admin only)
router.put('/agencies/:agencyId/authority-config/fields', auth, authorityConfigController.updateAuthorityFieldConfigurations);

// Get authority type options
router.get('/agencies/:agencyId/authority-config/types', auth, authorityConfigController.getAuthorityTypeOptions);

// Add custom authority type (Admin only)
router.post('/agencies/:agencyId/authority-config/types', auth, authorityConfigController.addAuthorityTypeOption);

// Get validation rules
router.get('/agencies/:agencyId/authority-config/validation', auth, authorityConfigController.getAuthorityValidationRules);

module.exports = router;
