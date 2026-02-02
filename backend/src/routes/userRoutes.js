const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All user routes require authentication
router.use(auth);

// Get all users (admin and supervisor)
router.get('/', authorize('Administrator', 'Supervisor'), userController.getAllUsers);

// Create user (admin only)
router.post('/', authorize('Administrator'), validate(schemas.register), userController.createUser);

// User-specific routes
router.get('/:userId', authorize('Administrator', 'Supervisor'), userController.getUserById);
router.put('/:userId', authorize('Administrator'), userController.updateUser);
router.delete('/:userId', authorize('Administrator'), userController.deleteUser);

module.exports = router;
