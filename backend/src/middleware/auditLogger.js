const { createAuditLog } = require('../controllers/auditLogController');
const { logger } = require('../config/logger');

/**
 * Audit Logger Middleware and Helpers
 * Simplifies audit logging across all controllers
 */

/**
 * Audit logging middleware
 * Automatically logs all API requests (optional)
 */
const auditMiddleware = (options = {}) => {
  const {
    excludePaths = ['/api/auth/login', '/api/auth/refresh'],
    includeBody = false
  } = options;

  return async (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data) {
      // Only log successful operations (200-299 status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const actionType = getActionTypeFromMethod(req.method);
        
        // Extract table name from path (e.g., /api/users/123 -> Users)
        const tableName = getTableNameFromPath(req.path);

        // Log the action (don't await to avoid blocking response)
        createAuditLog(
          req.user.id,
          actionType,
          tableName,
          req.params.id || null,
          null, // Old value - controller should log this explicitly
          includeBody ? req.body : null,
          req.ip,
          req.get('User-Agent')
        ).catch(err => logger.error('Audit logging failed:', err));
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Helper to log audit trail in controllers
 * Usage in controller:
 * await auditLog.create(req, 'Users', userId, newData);
 * await auditLog.update(req, 'Users', userId, oldData, newData);
 * await auditLog.delete(req, 'Users', userId, deletedData);
 */
const auditLog = {
  /**
   * Log CREATE action
   */
  create: async (req, tableName, recordId, newValue) => {
    try {
      await createAuditLog(
        req.user.id,
        'CREATE',
        tableName,
        recordId,
        null,
        sanitizeData(newValue),
        req.ip,
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Audit log create failed:', error);
    }
  },

  /**
   * Log UPDATE action
   */
  update: async (req, tableName, recordId, oldValue, newValue) => {
    try {
      await createAuditLog(
        req.user.id,
        'UPDATE',
        tableName,
        recordId,
        sanitizeData(oldValue),
        sanitizeData(newValue),
        req.ip,
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Audit log update failed:', error);
    }
  },

  /**
   * Log DELETE action
   */
  delete: async (req, tableName, recordId, oldValue) => {
    try {
      await createAuditLog(
        req.user.id,
        'DELETE',
        tableName,
        recordId,
        sanitizeData(oldValue),
        null,
        req.ip,
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Audit log delete failed:', error);
    }
  },

  /**
   * Log custom action (LOGIN, LOGOUT, EXPORT, etc.)
   */
  custom: async (req, actionType, tableName, recordId, data) => {
    try {
      await createAuditLog(
        req.user.id,
        actionType,
        tableName,
        recordId,
        null,
        sanitizeData(data),
        req.ip,
        req.get('User-Agent')
      );
    } catch (error) {
      logger.error('Audit log custom failed:', error);
    }
  }
};

/**
 * Sanitize data before logging (remove sensitive fields)
 */
function sanitizeData(data) {
  if (!data) {
    return null;
  }
  
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'Password_Hash', 'token', 'Token', 'secret', 'Secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Convert HTTP method to action type
 */
function getActionTypeFromMethod(method) {
  const methodMap = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
    'GET': 'READ'
  };
  return methodMap[method] || 'UNKNOWN';
}

/**
 * Extract table name from API path
 * Examples:
 * /api/users/123 -> Users
 * /api/authorities/456 -> Authorities
 * /api/config/pin-types -> Pin_Types
 */
function getTableNameFromPath(path) {
  const parts = path.split('/').filter(p => p && p !== 'api');
  if (parts.length === 0) {
    return 'Unknown';
  }
  
  const resource = parts[0];
  
  // Map resource names to table names
  const tableMap = {
    'users': 'Users',
    'agencies': 'Agencies',
    'authorities': 'Authorities',
    'alerts': 'Alert_Logs',
    'pins': 'Field_Pins',
    'trips': 'Trips',
    'subdivisions': 'Subdivisions',
    'audit': 'System_Audit_Logs',
    'branding': 'Agency_Branding'
  };
  
  return tableMap[resource] || resource.charAt(0).toUpperCase() + resource.slice(1);
}

/**
 * Decorator for controller functions to automatically log actions
 * Usage:
 * const createUser = withAudit('CREATE', 'Users', async (req, res) => { ... });
 */
function withAudit(actionType, tableName, controllerFn) {
  return async (req, res, next) => {
    try {
      // Execute controller function
      const result = await controllerFn(req, res, next);
      
      // Log successful action
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        await createAuditLog(
          req.user.id,
          actionType,
          tableName,
          req.params.id || req.body.id || null,
          req.body.oldValue || null,
          req.body.newValue || sanitizeData(req.body),
          req.ip,
          req.get('User-Agent')
        );
      }
      
      return result;
    } catch (error) {
      logger.error('Controller error:', error);
      throw error;
    }
  };
}

module.exports = {
  auditMiddleware,
  auditLog,
  withAudit
};
