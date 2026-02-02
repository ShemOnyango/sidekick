const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { logger } = require('../config/logger');

class UserController {
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = '', agencyId } = req.query;
      
      // If user is not admin, filter by their agency
      const filterAgencyId = req.user.Role === 'Administrator' 
        ? (agencyId || null) 
        : req.user.Agency_ID;
      
      const result = await User.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        agencyId: filterAgencyId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user has permission to view this user
      if (req.user.Role !== 'Administrator' && req.user.Agency_ID !== user.Agency_ID) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden - Cannot access user from different agency'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  }

  async createUser(req, res) {
    try {
      const userData = req.body;
      
      // Check if username already exists
      const existingUser = await User.findByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // User.create will hash the password internally
      const user = await User.create(userData);

      logger.info(`New user created: ${user.Username} by admin ${req.user.User_ID}`);

      res.status(201).json({
        success: true,
        data: { user },
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Check if user exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Map frontend field names to database column names
      const mappedData = {};
      if (updateData.employeeName !== undefined) {
        mappedData.Employee_Name = updateData.employeeName;
      }
      if (updateData.employeeContact !== undefined) {
        mappedData.Employee_Contact = updateData.employeeContact;
      }
      if (updateData.email !== undefined) {
        mappedData.Email = updateData.email;
      }
      if (updateData.role !== undefined) {
        mappedData.Role = updateData.role;
      }
      if (updateData.agencyId !== undefined) {
        mappedData.Agency_ID = updateData.agencyId;
      }

      // If password is being updated, hash it
      if (updateData.password) {
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        mappedData.Password_Hash = hashedPassword;
      }

      const user = await User.update(userId, mappedData);

      logger.info(`User updated: ${user.Username} by admin ${req.user.User_ID}`);

      res.json({
        success: true,
        data: { user },
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent deleting own account
      if (parseInt(userId) === req.user.User_ID) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }

      // Soft delete (deactivate) the user
      await User.deactivate(userId);

      logger.warn(`User deactivated: ${user.Username} by admin ${req.user.User_ID}`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }
}

module.exports = new UserController();
