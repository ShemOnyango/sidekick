const express = require('express');
const router = express.Router();
const brandingController = require('../controllers/brandingController');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure branding upload directory exists
const brandingDir = path.join(__dirname, '../../public/uploads/branding');
if (!fs.existsSync(brandingDir)) {
  fs.mkdirSync(brandingDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, brandingDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `agency-${req.params.agencyId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, SVG) are allowed'));
    }
  }
});

// All branding routes require authentication
router.use(auth);

/**
 * @route   GET /api/branding
 * @desc    Get all branding configurations (admin only)
 * @access  Private (Administrator)
 */
router.get('/', authorize('Administrator'), brandingController.getAllBranding);

/**
 * @route   GET /api/branding/agency/:agencyId
 * @desc    Get branding configuration for an agency
 * @access  Private
 */
router.get('/agency/:agencyId', brandingController.getBranding);

/**
 * @route   PUT /api/branding/agency/:agencyId
 * @desc    Update branding configuration
 * @access  Private (Administrator)
 */
router.put('/agency/:agencyId', authorize('Administrator'), brandingController.updateBranding);

/**
 * @route   POST /api/branding/agency/:agencyId/logo
 * @desc    Upload logo for agency
 * @access  Private (Administrator)
 * @query   logoType - 'logo' or 'icon'
 */
router.post(
  '/agency/:agencyId/logo',
  authorize('Administrator'),
  upload.single('logo'),
  brandingController.uploadLogo
);

/**
 * @route   DELETE /api/branding/agency/:agencyId/logo
 * @desc    Delete logo for agency
 * @access  Private (Administrator)
 * @query   logoType - 'logo' or 'icon'
 */
router.delete('/agency/:agencyId/logo', authorize('Administrator'), brandingController.deleteLogo);

/**
 * @route   GET /api/branding/agency/:agencyId/terminology
 * @desc    Get custom terminology for an agency
 * @access  Private
 */
router.get('/agency/:agencyId/terminology', brandingController.getTerminology);

/**
 * @route   PUT /api/branding/agency/:agencyId/terminology
 * @desc    Update custom terminology
 * @access  Private (Administrator)
 */
router.put('/agency/:agencyId/terminology', authorize('Administrator'), brandingController.updateTerminology);

module.exports = router;
