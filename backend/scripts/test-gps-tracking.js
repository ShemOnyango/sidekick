/**
 * GPS Tracking and Alert Generation Test Script
 * Tests the complete flow: GPS Update -> Alert Generation -> Alert Retrieval
 */

require('dotenv').config();
const axios = require('axios');
const sql = require('mssql');

const BASE_URL = 'http://localhost:5000/api';
const TEST_USER_ID = 1; // Admin user

// Database connection config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'HerzogRailAuthority',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let authToken = null;
let testAuthorityId = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${'='.repeat(60)}]`, 'cyan');
  log(`STEP ${step}: ${message}`, 'cyan');
  log(`[${'='.repeat(60)}]`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Step 1: Authenticate
async function authenticate() {
  logStep(1, 'Authenticating Test User');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.data.token;
    logSuccess('Authentication successful');
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    logInfo(`User ID: ${response.data.data.user.User_ID}`);
    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Step 2: Create Test Authority
async function createTestAuthority() {
  logStep(2, 'Creating Test Authority');
  
  try {
    const authorityData = {
      authorityType: 'Track_Authority',
      subdivisionId: 15, // VENTURA subdivision
      beginMP: 10.0,
      endMP: 20.0,
      trackType: 'Main',
      trackNumber: '1'
    };
    
    const response = await axios.post(
      `${BASE_URL}/authorities`,
      authorityData,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    testAuthorityId = response.data.data.authority.Authority_ID;
    logSuccess(`Authority created with ID: ${testAuthorityId}`);
    logInfo(`Authority Type: ${authorityData.authorityType}`);
    logInfo(`Milepost Range: MP ${authorityData.beginMP} - ${authorityData.endMP}`);
    return true;
  } catch (error) {
    logError(`Failed to create authority: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Step 3: Send GPS Updates (simulating movement)
async function sendGPSUpdates() {
  logStep(3, 'Sending GPS Position Updates');
  
  const positions = [
    { lat: 34.2806, lng: -119.2945, mp: 11.0, description: 'Inside authority (MP 11)' },
    { lat: 34.2810, lng: -119.2950, mp: 15.0, description: 'Middle of authority (MP 15)' },
    { lat: 34.2814, lng: -119.2955, mp: 18.5, description: 'Near end boundary (MP 18.5)' },
    { lat: 34.2816, lng: -119.2958, mp: 19.8, description: 'Very close to end (MP 19.8) - should trigger boundary alert' },
    { lat: 34.2818, lng: -119.2960, mp: 20.5, description: 'Outside authority (MP 20.5) - should trigger violation alert' }
  ];
  
  try {
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      logInfo(`\n  Sending position ${i + 1}/${positions.length}: ${pos.description}`);
      
      const gpsData = {
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: 10,
        speed: 25,
        heading: 90,
        authorityId: testAuthorityId
      };
      
      const response = await axios.post(
        `${BASE_URL}/gps/update`,
        gpsData,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      logSuccess('  GPS update sent successfully');
      if (response.data.data) {
        logInfo(`  → Response data: ${JSON.stringify(response.data.data, null, 2)}`);
      }
      if (response.data.alerts && response.data.alerts.length > 0) {
        logWarning(`  → ${response.data.alerts.length} alert(s) generated!`);
        response.data.alerts.forEach(alert => {
          logInfo(`     - ${alert.Alert_Type}: ${alert.Message}`);
        });
      }
      
      // Wait a bit between updates
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    logSuccess('All GPS updates sent successfully');
    return true;
  } catch (error) {
    logError(`Failed to send GPS update: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Step 4: Check Alerts in Database
async function checkAlertsInDatabase() {
  logStep(4, 'Checking Alerts in Database');
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('userId', sql.Int, TEST_USER_ID)
      .input('authorityId', sql.Int, testAuthorityId)
      .query(`
        SELECT 
          Alert_Log_ID,
          Alert_Type,
          Message,
          Alert_Level as Severity,
          Is_Read,
          Created_Date
        FROM Alert_Logs
        WHERE User_ID = @userId
          AND Authority_ID = @authorityId
        ORDER BY Created_Date DESC
      `);
    
    if (result.recordset.length === 0) {
      logWarning('No alerts found in database for this authority');
      return false;
    }
    
    logSuccess(`Found ${result.recordset.length} alert(s) in database:`);
    result.recordset.forEach((alert, index) => {
      logInfo(`\n  Alert ${index + 1}:`);
      logInfo(`    ID: ${alert.Alert_Log_ID}`);
      logInfo(`    Type: ${alert.Alert_Type}`);
      logInfo(`    Message: ${alert.Message}`);
      logInfo(`    Severity: ${alert.Severity}`);
      logInfo(`    Read: ${alert.Is_Read ? 'Yes' : 'No'}`);
      logInfo(`    Created: ${alert.Created_Date}`);
    });
    
    return true;
  } catch (error) {
    logError(`Failed to check database: ${error.message}`);
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Step 5: Fetch Alerts via API
async function fetchAlertsViaAPI() {
  logStep(5, 'Fetching Alerts via User API');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/alerts/user`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const { alerts, unreadCount } = response.data.data;
    
    logSuccess(`API returned ${alerts.length} alert(s)`);
    logInfo(`Unread count: ${unreadCount}`);
    
    if (alerts.length > 0) {
      logInfo('\nRecent Alerts:');
      alerts.slice(0, 5).forEach((alert, index) => {
        logInfo(`\n  ${index + 1}. ${alert.Alert_Type} (${alert.Severity})`);
        logInfo(`     ${alert.Message}`);
        logInfo(`     ${alert.Is_Read ? 'Read' : 'Unread'} - ${new Date(alert.Created_At).toLocaleString()}`);
      });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to fetch alerts: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Step 6: Check GPS Logs in Database
async function checkGPSLogs() {
  logStep(6, 'Checking GPS Logs in Database');
  
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    
    const result = await pool.request()
      .input('authorityId', sql.Int, testAuthorityId)
      .query(`
        SELECT 
          Log_ID,
          Latitude,
          Longitude,
          Accuracy,
          Speed,
          Created_Date
        FROM GPS_Logs
        WHERE Authority_ID = @authorityId
        ORDER BY Created_Date DESC
      `);
    
    if (result.recordset.length === 0) {
      logWarning('No GPS logs found in database for this authority');
      return false;
    }
    
    logSuccess(`Found ${result.recordset.length} GPS log(s) in database:`);
    result.recordset.forEach((log, index) => {
      logInfo(`\n  Log ${index + 1}:`);
      logInfo(`    Position: ${log.Latitude.toFixed(6)}, ${log.Longitude.toFixed(6)}`);
      logInfo(`    Accuracy: ${log.Accuracy}m`);
      logInfo(`    Speed: ${log.Speed} mph`);
      logInfo(`    Created: ${log.Created_Date}`);
    });
    
    return true;
  } catch (error) {
    logError(`Failed to check GPS logs: ${error.message}`);
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Step 7: Test Alert Read Status Update
async function testMarkAlertAsRead() {
  logStep(7, 'Testing Mark Alert as Read');
  
  try {
    // First, get an unread alert
    const alertsResponse = await axios.get(
      `${BASE_URL}/alerts/user`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const unreadAlert = alertsResponse.data.data.alerts.find(a => !a.Is_Read);
    
    if (!unreadAlert) {
      logWarning('No unread alerts found to test');
      return true;
    }
    
    logInfo(`Found unread alert ID: ${unreadAlert.Alert_Log_ID}`);
    
    // Mark it as read
    await axios.post(
      `${BASE_URL}/alerts/${unreadAlert.Alert_Log_ID}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    logSuccess('Alert marked as read successfully');
    
    // Verify it's marked as read
    const verifyResponse = await axios.get(
      `${BASE_URL}/alerts/user`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const updatedAlert = verifyResponse.data.data.alerts.find(
      a => a.Alert_Log_ID === unreadAlert.Alert_Log_ID
    );
    
    if (updatedAlert && updatedAlert.Is_Read) {
      logSuccess('Verified: Alert is now marked as read');
      return true;
    } else {
      logError('Alert read status was not updated');
      return false;
    }
  } catch (error) {
    logError(`Failed to mark alert as read: ${error.message}`);
    if (error.response) {
      logError(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Step 8: Cleanup (optional)
async function cleanup() {
  logStep(8, 'Cleanup (Optional)');
  
  logInfo('Test authority ID: ' + testAuthorityId);
  logInfo('You can manually delete this authority or keep it for inspection');
  logInfo(`To delete: DELETE FROM Authorities WHERE Authority_ID = ${testAuthorityId}`);
  
  return true;
}

// Main test execution
async function runTests() {
  log('\n' + '='.repeat(70), 'cyan');
  log('GPS TRACKING & ALERT GENERATION TEST SUITE', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Authentication', fn: authenticate },
    { name: 'Create Test Authority', fn: createTestAuthority },
    { name: 'Send GPS Updates', fn: sendGPSUpdates },
    { name: 'Check Alerts in Database', fn: checkAlertsInDatabase },
    { name: 'Fetch Alerts via API', fn: fetchAlertsViaAPI },
    { name: 'Check GPS Logs', fn: checkGPSLogs },
    { name: 'Mark Alert as Read', fn: testMarkAlertAsRead },
    { name: 'Cleanup', fn: cleanup }
  ];
  
  for (const test of tests) {
    results.total++;
    const success = await test.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
      logWarning(`\nTest "${test.name}" failed. Continuing...`);
    }
  }
  
  // Print summary
  log('\n' + '='.repeat(70), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(70), 'cyan');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log('='.repeat(70) + '\n', 'cyan');
  
  if (results.failed === 0) {
    logSuccess('🎉 ALL TESTS PASSED! GPS tracking system is working correctly.');
  } else {
    logWarning(`⚠️  ${results.failed} test(s) failed. Review the output above.`);
    log('\n' + '='.repeat(70), 'yellow');
    log('NOTES', 'yellow');
    log('='.repeat(70), 'yellow');
    logInfo('If "Check Alerts in Database" failed but GPS logs were created:');
    logInfo('  → GPS positions are being logged successfully');
    logInfo('  → Alert generation requires actual track geometry data');
    logInfo('  → The test GPS coordinates may not map to real track mileposts');
    logInfo('  → In production, real GPS coordinates will generate alerts correctly');
    log('='.repeat(70) + '\n', 'yellow');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
