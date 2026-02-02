const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const alertConfigController = require('../controllers/alertConfigController');

// Get all alert configurations for an agency
router.get('/agencies/:agencyId/alert-configs', auth, alertConfigController.getAlertConfigurations);

// Get alert configurations by type
router.get('/agencies/:agencyId/alert-configs/:configType', auth, alertConfigController.getAlertConfigurationsByType);

// Create a new alert configuration (Admin only)
router.post('/agencies/:agencyId/alert-configs', auth, alertConfigController.createAlertConfiguration);

// Update an alert configuration (Admin only)
router.put('/agencies/:agencyId/alert-configs/:configId', auth, alertConfigController.updateAlertConfiguration);

// Delete an alert configuration (Admin only)
router.delete('/agencies/:agencyId/alert-configs/:configId', auth, alertConfigController.deleteAlertConfiguration);

// Bulk update alert configurations (Admin only)
router.put('/agencies/:agencyId/alert-configs', auth, alertConfigController.bulkUpdateAlertConfigurations);

module.exports = router;
