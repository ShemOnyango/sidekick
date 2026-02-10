const express = require('express');
const router = express.Router();
const tripReportController = require('../controllers/tripReportController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

/**
 * @route   GET /api/trip-reports/:authorityId
 * @desc    Get trip report data
 * @access  Private
 */
router.get('/:authorityId', tripReportController.getTripReport);

/**
 * @route   GET /api/trip-reports/:authorityId/pdf
 * @desc    Generate PDF trip report
 * @access  Private
 */
router.get('/:authorityId/pdf', tripReportController.generatePDFReport);

/**
 * @route   POST /api/trip-reports/email
 * @desc    Email trip report
 * @access  Private
 */
router.post('/email', tripReportController.emailTripReport);

module.exports = router;
