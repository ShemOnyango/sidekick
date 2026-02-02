# Audit Logging Integration Guide

## Overview
This guide shows how to integrate audit logging into existing controllers using the new `auditLogger.js` middleware.

## Method 1: Using auditLog Helper (Recommended)

### Example: User Controller with Audit Logging

```javascript
const { auditLog } = require('../middleware/auditLogger');

/**
 * Create new user
 */
const createUser = async (req, res) => {
  try {
    const { username, email, role, agencyId } = req.body;

    // Create user in database
    const newUser = await User.create({
      username,
      email,
      role,
      agencyId
    });

    // Log the creation
    await auditLog.create(req, 'Users', newUser.User_ID, {
      username: newUser.Username,
      email: newUser.Email,
      role: newUser.Role
    });

    res.json({
      success: true,
      data: newUser
    });

  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, role } = req.body;

    // Get old data before update
    const oldUser = await User.findById(userId);
    const oldData = {
      username: oldUser.Username,
      email: oldUser.Email,
      role: oldUser.Role
    };

    // Update user
    const updatedUser = await User.update(userId, {
      username,
      email,
      role
    });

    const newData = {
      username: updatedUser.Username,
      email: updatedUser.Email,
      role: updatedUser.Role
    };

    // Log the update
    await auditLog.update(req, 'Users', userId, oldData, newData);

    res.json({
      success: true,
      data: updatedUser
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user data before deletion
    const user = await User.findById(userId);
    const oldData = {
      username: user.Username,
      email: user.Email,
      role: user.Role
    };

    // Delete user
    await User.delete(userId);

    // Log the deletion
    await auditLog.delete(req, 'Users', userId, oldData);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

/**
 * Custom action example: Export users
 */
const exportUsers = async (req, res) => {
  try {
    const users = await User.findAll();

    // Generate Excel file
    const excelFile = await generateExcel(users);

    // Log the export action
    await auditLog.custom(req, 'EXPORT', 'Users', null, {
      recordCount: users.length,
      format: 'Excel'
    });

    res.download(excelFile);

  } catch (error) {
    logger.error('Export users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export users',
      error: error.message
    });
  }
};
```

## Method 2: Using Audit Middleware (Automatic Logging)

### Add to server.js or app.js

```javascript
const { auditMiddleware } = require('./middleware/auditLogger');

// Apply to all routes (logs all successful API calls)
app.use(auditMiddleware({
  excludePaths: ['/api/auth/login', '/api/auth/refresh', '/api/health'],
  includeBody: false  // Set true to log request body (may include sensitive data)
}));

// Your routes here
app.use('/api', routes);
```

**Note**: Middleware logs actions automatically but with less detail. For important operations (CREATE, UPDATE, DELETE), use the explicit `auditLog` helper.

## Method 3: Using withAudit Decorator

```javascript
const { withAudit } = require('../middleware/auditLogger');

// Wrap controller function
const createUser = withAudit('CREATE', 'Users', async (req, res) => {
  const newUser = await User.create(req.body);
  
  // Attach to req.body for audit logging
  req.body.id = newUser.User_ID;
  req.body.newValue = {
    username: newUser.Username,
    role: newUser.Role
  };

  res.json({
    success: true,
    data: newUser
  });
});
```

## Custom Action Types

You can log any action type:

```javascript
// Login event
await auditLog.custom(req, 'LOGIN', 'Users', userId, {
  loginTime: new Date(),
  ipAddress: req.ip
});

// Logout event
await auditLog.custom(req, 'LOGOUT', 'Users', userId, {
  logoutTime: new Date(),
  sessionDuration: sessionDuration
});

// Configuration change
await auditLog.custom(req, 'CONFIG_CHANGE', 'Alert_Configuration', configId, {
  settingName: 'proximity_threshold',
  oldValue: '0.5',
  newValue: '0.25'
});

// File upload
await auditLog.custom(req, 'UPLOAD', 'Track_Data', null, {
  fileName: file.originalname,
  fileSize: file.size,
  recordsImported: importedCount
});

// Email notification sent
await auditLog.custom(req, 'EMAIL_SENT', 'Users', userId, {
  emailType: 'config_change_notification',
  recipient: 'ryan.medlin@example.com'
});
```

## Integration Checklist

For each controller, add audit logging for:

- ✅ **CREATE operations** - Use `auditLog.create()`
- ✅ **UPDATE operations** - Use `auditLog.update()`
- ✅ **DELETE operations** - Use `auditLog.delete()`
- ✅ **EXPORT operations** - Use `auditLog.custom(req, 'EXPORT', ...)`
- ✅ **LOGIN/LOGOUT** - Use `auditLog.custom(req, 'LOGIN|LOGOUT', ...)`
- ✅ **CONFIG changes** - Use `auditLog.custom(req, 'CONFIG_CHANGE', ...)`

## Controllers to Update

Priority list:

1. **authController.js** - Login, logout, token refresh
2. **agencyController.js** - Create, update, delete agencies
3. **authorityController.js** - Create, update, end authorities
4. **alertConfigController.js** - Proximity threshold changes (email Ryan!)
5. **authorityConfigController.js** - Field label changes (email Ryan!)
6. **pinTypeController.js** - Pin category changes (email Ryan!)
7. **brandingController.js** - Theme/logo changes (email Ryan!)
8. **uploadController.js** - Track data imports
9. **tripController.js** - Export trips
10. **userController.js** - User CRUD operations

## Email Integration for Configuration Changes

**Client Requirement**: Ryan Medlin must be notified of all configuration changes.

```javascript
const emailService = require('../services/emailService');
const { auditLog } = require('../middleware/auditLogger');

const updateAlertConfig = async (req, res) => {
  try {
    const { configId } = req.params;
    const { proximityThreshold } = req.body;

    // Get old config
    const oldConfig = await AlertConfig.findById(configId);

    // Update config
    const updatedConfig = await AlertConfig.update(configId, {
      proximityThreshold
    });

    // Log the change
    await auditLog.update(req, 'Alert_Configuration', configId, 
      { proximityThreshold: oldConfig.Proximity_Threshold },
      { proximityThreshold: updatedConfig.Proximity_Threshold }
    );

    // Email Ryan Medlin about the change
    await emailService.sendConfigChangeNotification({
      to: 'ryan.medlin@example.com',
      configType: 'Alert Configuration',
      changes: {
        field: 'Proximity Threshold',
        oldValue: `${oldConfig.Proximity_Threshold} miles`,
        newValue: `${updatedConfig.Proximity_Threshold} miles`
      },
      changedBy: req.user.username,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: updatedConfig
    });

  } catch (error) {
    logger.error('Update alert config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert configuration',
      error: error.message
    });
  }
};
```

## Testing Audit Logs

### Manual Testing

1. Perform actions in admin portal (create user, update authority, etc.)
2. Navigate to `/audit-logs`
3. Verify logs appear with correct:
   - User
   - Action type
   - Table name
   - Old/new values
   - Timestamp

### Automated Testing

```javascript
describe('Audit Logging', () => {
  it('should log user creation', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser',
        email: 'test@example.com',
        role: 'Worker'
      });

    expect(response.status).toBe(200);

    // Check audit log was created
    const auditLogs = await getAuditLogs({ 
      actionType: 'CREATE',
      tableName: 'Users'
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].Action_Type).toBe('CREATE');
    expect(auditLogs[0].Table_Name).toBe('Users');
  });
});
```

## Performance Considerations

1. **Don't await audit logs in critical paths** - Audit logging should not slow down API responses
2. **Use try-catch** - Audit log failures should not break main operations
3. **Sanitize data** - Remove passwords, tokens, sensitive info before logging
4. **Database indexes** - Ensure System_Audit_Logs has indexes on User_ID, Created_Date, Action_Type
5. **Archival strategy** - Plan to archive old logs (> 1 year) to separate table

## Sensitive Data Handling

The `auditLog` helper automatically redacts these fields:
- `password`
- `Password_Hash`
- `token`
- `Token`
- `secret`
- `Secret`

To add more sensitive fields, edit `sanitizeData()` function in `auditLogger.js`.

## Summary

**Quick Integration Steps**:

1. Import: `const { auditLog } = require('../middleware/auditLogger');`
2. After CREATE: `await auditLog.create(req, 'TableName', recordId, newData);`
3. After UPDATE: `await auditLog.update(req, 'TableName', recordId, oldData, newData);`
4. After DELETE: `await auditLog.delete(req, 'TableName', recordId, oldData);`
5. For config changes: Also send email to Ryan Medlin using `emailService.sendConfigChangeNotification()`

That's it! All changes will appear in the Audit Logs page.
