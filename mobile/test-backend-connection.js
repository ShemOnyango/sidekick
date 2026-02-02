/**
 * Backend Connection Test Script
 * Tests mobile app API endpoints communication with backend
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = null;
let agencyId = 1;

// Color console output
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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

// API Test Functions
async function testHealthCheck() {
  try {
    logInfo('Testing health check endpoint...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.data.status === 'ok') {
      logSuccess('Health check passed');
      logInfo(`Service: ${response.data.service}`);
      logInfo(`Version: ${response.data.version}`);
      logInfo(`Timestamp: ${response.data.timestamp}`);
      return true;
    }
    logError('Health check failed: Invalid response');
    return false;
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  try {
    logInfo('Testing login endpoint...');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      agencyId = response.data.data.user.agencyId || 1;
      logSuccess('Login successful');
      logInfo(`User: ${response.data.data.user.email}`);
      logInfo(`Role: ${response.data.data.user.role}`);
      logInfo(`Agency ID: ${agencyId}`);
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    }
    logError('Login failed: No token received');
    return false;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testProfile() {
  try {
    logInfo('Testing profile endpoint...');
    const response = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Profile fetch successful');
      logInfo(`Email: ${response.data.data.email}`);
      logInfo(`Role: ${response.data.data.role}`);
      return true;
    }
    logError('Profile fetch failed');
    return false;
  } catch (error) {
    logError(`Profile fetch failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetAgencies() {
  try {
    logInfo('Testing agencies list endpoint...');
    const response = await axios.get(`${BASE_URL}/agencies`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 10 }
    });
    
    if (response.data.success) {
      logSuccess('Agencies list fetch successful');
      logInfo(`Total agencies: ${response.data.data.total || 0}`);
      logInfo(`Agencies in page: ${response.data.data.agencies?.length || 0}`);
      return true;
    }
    logError('Agencies list fetch failed');
    return false;
  } catch (error) {
    logError(`Agencies list failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetActiveAuthorities() {
  try {
    logInfo('Testing active authorities endpoint...');
    const response = await axios.get(`${BASE_URL}/authorities/active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Active authorities fetch successful');
      logInfo(`Active authorities: ${response.data.data?.length || 0}`);
      return true;
    }
    logError('Active authorities fetch failed');
    return false;
  } catch (error) {
    logError(`Active authorities failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetUserAuthorities() {
  try {
    logInfo('Testing user authorities endpoint...');
    const response = await axios.get(`${BASE_URL}/authorities/my`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('User authorities fetch successful');
      logInfo(`User authorities: ${response.data.data?.length || 0}`);
      return true;
    }
    logError('User authorities fetch failed');
    return false;
  } catch (error) {
    logError(`User authorities failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetAlerts() {
  try {
    logInfo('Testing alerts endpoint...');
    const response = await axios.get(`${BASE_URL}/alerts/${agencyId}/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
    });
    
    if (response.data.success) {
      logSuccess('Alerts fetch successful');
      logInfo(`Alerts found: ${response.data.data?.length || 0}`);
      return true;
    }
    logError('Alerts fetch failed');
    return false;
  } catch (error) {
    logError(`Alerts fetch failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetPins() {
  try {
    logInfo('Testing pins endpoint...');
    const response = await axios.get(`${BASE_URL}/pins/authority/1`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { active: true }
    });
    
    if (response.data.success) {
      logSuccess('Pins fetch successful');
      logInfo(`Pins found: ${response.data.data?.length || 0}`);
      return true;
    }
    logError('Pins fetch failed');
    return false;
  } catch (error) {
    logError(`Pins fetch failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testAnalyticsDashboard() {
  try {
    logInfo('Testing analytics dashboard endpoint...');
    const response = await axios.get(`${BASE_URL}/analytics/${agencyId}/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Analytics dashboard fetch successful');
      logInfo(`Authority stats: ${JSON.stringify(response.data.data.authorityStats || {})}`);
      return true;
    }
    logError('Analytics dashboard fetch failed');
    return false;
  } catch (error) {
    logError(`Analytics dashboard failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testGetAuditLogs() {
  try {
    logInfo('Testing audit logs endpoint...');
    const response = await axios.get(`${BASE_URL}/audit/${agencyId}/logs`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 5 }
    });
    
    if (response.data.success) {
      logSuccess('Audit logs fetch successful');
      logInfo(`Audit logs found: ${response.data.data?.length || 0}`);
      return true;
    }
    logError('Audit logs fetch failed');
    return false;
  } catch (error) {
    logError(`Audit logs fetch failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║  Herzog Rail Authority - Mobile Backend Connection Test  ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Login', fn: testLogin },
    { name: 'Profile', fn: testProfile },
    { name: 'Agencies List', fn: testGetAgencies },
    { name: 'Active Authorities', fn: testGetActiveAuthorities },
    { name: 'User Authorities', fn: testGetUserAuthorities },
    { name: 'Alerts', fn: testGetAlerts },
    { name: 'Pins', fn: testGetPins },
    { name: 'Analytics Dashboard', fn: testAnalyticsDashboard },
    { name: 'Audit Logs', fn: testGetAuditLogs }
  ];

  for (const test of tests) {
    logSection(test.name);
    results.total++;
    
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      logError(`Unexpected error: ${error.message}`);
      results.failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Summary
  logSection('Test Summary');
  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`, 
    results.failed === 0 ? 'green' : 'yellow');
  
  log('\n');
  
  if (results.failed === 0) {
    logSuccess('All tests passed! Mobile app can communicate with backend.');
  } else {
    logError(`${results.failed} test(s) failed. Please check the backend configuration.`);
  }
}

// Run the tests
runTests().catch(error => {
  logError(`Test runner error: ${error.message}`);
  process.exit(1);
});
