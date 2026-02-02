/**
 * Redux Boolean Type Logger Middleware
 * Logs all actions that might contain boolean values to help trace string-to-boolean errors
 */

const BOOLEAN_PROPS = [
  'enabled', 'disabled', 'visible', 'hidden', 'editable', 'multiline',
  'secureTextEntry', 'notificationsEnabled', 'soundEnabled', 'vibrationEnabled',
  'proximityAlertsEnabled', 'locationAlways', 'backgroundLocationEnabled',
  'highAccuracyGPS', 'offlineMode', 'autoDownloadEnabled', 'wifiOnlyDownloads',
  'powerSavingMode', 'followMeEnabled', 'showMileposts', 'showTrackNumbers',
  'showAuthorities', 'showPins'
];

const checkForStringBooleans = (obj, path = '') => {
  const issues = [];
  
  if (obj === null || obj === undefined) return issues;
  
  if (typeof obj === 'string' && (obj === 'true' || obj === 'false')) {
    issues.push({
      path,
      value: obj,
      type: typeof obj,
      issue: `STRING BOOLEAN DETECTED: "${obj}"`
    });
  }
  
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    Object.keys(obj).forEach(key => {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if this is a boolean prop with string value
      if (BOOLEAN_PROPS.includes(key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          issues.push({
            path: currentPath,
            value,
            type: typeof value,
            issue: `⚠️ BOOLEAN PROP "${key}" HAS STRING VALUE`
          });
        }
      }
      
      issues.push(...checkForStringBooleans(obj[key], currentPath));
    });
  }
  
  return issues;
};

export const booleanTypeLoggerMiddleware = store => next => action => {
  // Check action payload for string booleans
  if (action.payload) {
    const issues = checkForStringBooleans(action.payload, 'action.payload');
    
    if (issues.length > 0) {
      console.group(`🔴 BOOLEAN TYPE ISSUE DETECTED in ${action.type}`);
      console.warn('Action:', action.type);
      console.warn('Payload:', JSON.stringify(action.payload, null, 2));
      issues.forEach(issue => {
        console.error(`${issue.issue} at ${issue.path}`);
        console.error(`  Value: "${issue.value}" (type: ${issue.type})`);
      });
      console.trace('Stack trace:');
      console.groupEnd();
    }
  }
  
  return next(action);
};

export default booleanTypeLoggerMiddleware;
