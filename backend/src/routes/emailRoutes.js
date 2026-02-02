const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { auth } = require('../middleware/auth');

// Send alert summary email
router.post('/send-alert-summary', auth, emailController.sendAlertSummary);

// Test email configuration
router.get('/test-connection', auth, emailController.testEmailConnection);

// Get email logs
router.get('/logs', auth, emailController.getEmailLogs);

module.exports = router;
