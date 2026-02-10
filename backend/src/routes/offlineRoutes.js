const express = require('express');
const router = express.Router();
const offlineController = require('../controllers/offlineController');
const { auth } = require('../middleware/auth');

// All offline routes require authentication
router.use(auth);

/**
 * @route   GET /api/offline/downloads/available
 * @desc    Get available downloads for user's agency
 * @access  Private
 */
router.get('/downloads/available', offlineController.getAvailableDownloads);

/**
 * @route   GET /api/offline/downloads/history
 * @desc    Get user's download history
 * @access  Private
 */
router.get('/downloads/history', offlineController.getDownloadHistory);

/**
 * @route   GET /api/offline/downloads/status
 * @desc    Check if offline data needs update
 * @access  Private
 * @query   downloadType - Type of download to check
 * @query   subdivisionId - Optional subdivision ID
 */
router.get('/downloads/status', offlineController.checkDownloadStatus);

/**
 * @route   POST /api/offline/downloads/invalidate
 * @desc    Invalidate old downloads
 * @access  Private
 */
router.post('/downloads/invalidate', offlineController.invalidateOldDownloads);

/**
 * @route   GET /api/offline/agency/:agencyId
 * @desc    Download agency data package
 * @access  Private
 */
router.get('/agency/:agencyId', offlineController.downloadAgencyData);

/**
 * @route   GET /api/offline/agency/:agencyId/subdivision/:subdivisionId
 * @desc    Download subdivision data with milepost geometry
 * @access  Private
 */
router.get('/agency/:agencyId/subdivision/:subdivisionId', offlineController.downloadSubdivisionData);

/**
 * @route   GET /api/offline/subdivision/:subdivisionId
 * @desc    Download subdivision data (uses user's agency from token)
 * @access  Private
 */
router.get('/subdivision/:subdivisionId', offlineController.downloadSubdivisionDataByUser);

module.exports = router;
