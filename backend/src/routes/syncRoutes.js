const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { auth } = require('../middleware/auth');

// All sync routes require authentication
router.use(auth);

// POST /api/sync - accept batch sync items
router.post('/', syncController.syncData);

module.exports = router;
