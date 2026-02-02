const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { logger } = require('../config/logger');
const jwt = require('jsonwebtoken');

class AuthController {
  async register(req, res) {
    try {
      const {
        username,
        password,
        employeeName,
        employeeContact,
        email,
        role = 'Field_Worker',
        agencyId
      } = req.body;

      // Validation
      if (!username || !password || !employeeName || !agencyId) {
        return res.status(400).json({
          success: false,
          error: 'Username, password, employee name, and agency are required'
        });
      }

      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Create user
      const userData = {
        agencyId,
        username,
        password,
        employeeName,
        employeeContact,
        email,
        role
      };

      const user = await User.create(userData);

      // Generate token
      const token = generateToken(user);

      // Update last login
      await User.updateLastLogin(user.User_ID);

      // Log the registration
      logger.info(`New user registered: ${username} (${employeeName})`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            User_ID: user.User_ID,
            Username: user.Username,
            Employee_Name: user.Employee_Name,
            Employee_Contact: user.Employee_Contact,
            Email: user.Email,
            Role: user.Role,
            Agency_ID: user.Agency_ID,
            Agency_CD: user.Agency_CD,
            Agency_Name: user.Agency_Name
          },
          token
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      // Find user
      const user = await User.findByUsername(username);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.Is_Active) {
        return res.status(403).json({
          success: false,
          error: 'Account is inactive'
        });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(password, user.Password_Hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate token
      const token = generateToken(user);

      // Update last login
      await User.updateLastLogin(user.User_ID);

      // Log the login
      logger.info(`User logged in: ${username} from IP: ${req.ip}`);

      res.json({
        success: true,
        data: {
          user: {
            User_ID: user.User_ID,
            Username: user.Username,
            Employee_Name: user.Employee_Name,
            Employee_Contact: user.Employee_Contact,
            Email: user.Email,
            Role: user.Role,
            Agency_ID: user.Agency_ID,
            Agency_CD: user.Agency_CD,
            Agency_Name: user.Agency_Name,
            Last_Login: user.Last_Login
          },
          token
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }

  async logout(req, res) {
    try {
      // In a stateless JWT system, we can't invalidate tokens server-side
      // Clients should delete the token on their side
      // We could implement a token blacklist if needed
      
      logger.info(`User logged out: ${req.user.Username} (${req.user.Employee_Name})`);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          user: {
            User_ID: user.User_ID,
            Username: user.Username,
            Employee_Name: user.Employee_Name,
            Employee_Contact: user.Employee_Contact,
            Email: user.Email,
            Role: user.Role,
            Agency_ID: user.Agency_ID,
            Agency_CD: user.Agency_CD,
            Agency_Name: user.Agency_Name,
            Is_Active: user.Is_Active,
            Last_Login: user.Last_Login,
            Created_Date: user.Created_Date
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { userId } = req.user;
      const updateData = req.body;

      // Remove fields that shouldn't be updated via profile
      delete updateData.Password_Hash;
      delete updateData.Username;
      delete updateData.Agency_ID;
      delete updateData.Role; // Role changes should be done by admin

      const updatedUser = await User.update(userId, updateData);

      res.json({
        success: true,
        data: {
          user: {
            User_ID: updatedUser.User_ID,
            Username: updatedUser.Username,
            Employee_Name: updatedUser.Employee_Name,
            Employee_Contact: updatedUser.Employee_Contact,
            Email: updatedUser.Email,
            Role: updatedUser.Role,
            Agency_ID: updatedUser.Agency_ID
          }
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { userId, Username } = req.user;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      // Get user with password hash
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await User.verifyPassword(currentPassword, user.Password_Hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password
      await User.updatePassword(userId, newPassword);

      logger.info(`Password changed for user: ${Username}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }

  async verify(req, res) {
    try {
      // The auth middleware already verified the token
      // Just return the user data
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          user: {
            User_ID: user.User_ID,
            Username: user.Username,
            Employee_Name: user.Employee_Name,
            Employee_Contact: user.Employee_Contact,
            Email: user.Email,
            Role: user.Role,
            Agency_ID: user.Agency_ID,
            Agency_CD: user.Agency_CD,
            Agency_Name: user.Agency_Name
          }
        }
      });
    } catch (error) {
      logger.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token is required'
        });
      }

      // Verify token (allow expired tokens for refresh)
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
      
      // Get fresh user data
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.Is_Active) {
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      // Generate new token
      const newToken = generateToken(user);

      res.json({
        success: true,
        data: {
          token: newToken,
          expiresIn: process.env.JWT_EXPIRE || '7d'
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }
}

module.exports = new AuthController();