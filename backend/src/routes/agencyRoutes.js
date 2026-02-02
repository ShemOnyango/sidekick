const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const { auth, authorize, agencyAccess } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All agency routes require authentication
router.use(auth);

// Get all agencies (admin only)
router.get('/', authorize('Administrator'), (req, res) => agencyController.getAllAgencies(req, res));

// Create agency (admin only)
router.post('/', authorize('Administrator'), validate(schemas.agency), (req, res) => agencyController.createAgency(req, res));

// Agency-specific routes
router.get('/:agencyId', agencyAccess, (req, res) => agencyController.getAgencyById(req, res));
router.put('/:agencyId', authorize('Administrator'), agencyAccess, validate(schemas.agency), (req, res) => agencyController.updateAgency(req, res));
router.delete('/:agencyId', authorize('Administrator'), agencyAccess, (req, res) => agencyController.deleteAgency(req, res));
router.get('/:agencyId/stats', agencyAccess, (req, res) => agencyController.getAgencyStats(req, res));

module.exports = router;
