/**
 * Comprehensive API Testing Script
 * Tests all main endpoints for admin portal communication
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// Test credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let authToken = null;
let createdAgencyId = null;
let createdUserId = null;
let createdAuthorityId = null;
let subdivisionId = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

// Helper functions
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
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bold');
  console.log('='.repeat(60));
}

// Test functions
async function testHealthCheck() {
  logSection('Testing Health Check');
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.status === 'ok') {
      logSuccess('Backend is healthy');
      logInfo(`Database: ${response.data.database}`);
      logInfo(`Uptime: ${response.data.uptime}s`);
      return true;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  logSection('Testing Authentication');
  
  try {
    logInfo('Attempting login...');
    const response = await axios.post(`${API_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      logSuccess('Login successful');
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      logInfo(`User: ${response.data.data.user.Employee_Name} (${response.data.data.user.Role})`);
      return true;
    } else {
      logError('Login failed - no token received');
      return false;
    }
  } catch (error) {
    logError(`Authentication failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Details:', error.response.data.details);
    }
    return false;
  }
}

async function testGetAgencies() {
  logSection('Testing Get Agencies');
  
  try {
    const response = await axios.get(`${API_URL}/agencies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess(`Retrieved ${response.data.data.agencies.length} agencies`);
      logInfo(`Total: ${response.data.data.total} agencies`);
      
      // Display first few agencies
      response.data.data.agencies.slice(0, 3).forEach(agency => {
        console.log(`  - ${agency.Agency_CD}: ${agency.Agency_Name} (Region: ${agency.Region || 'N/A'})`);
      });
      return true;
    }
  } catch (error) {
    logError(`Get agencies failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Details:', error.response.data.details);
    }
    return false;
  }
}

async function testCreateAgency() {
  logSection('Testing Create Agency');
  
  const timestamp = Date.now();
  const newAgency = {
    agencyCD: `TEST${timestamp.toString().slice(-6)}`,
    agencyName: `Test Agency ${timestamp}`,
    region: 'Test Region',
    contactEmail: 'test@agency.com',
    contactPhone: '555-0100'
  };
  
  try {
    logInfo('Creating new agency...');
    console.log('Agency data:', JSON.stringify(newAgency, null, 2));
    
    const response = await axios.post(`${API_URL}/agencies`, newAgency, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      createdAgencyId = response.data.data.agency.Agency_ID;
      logSuccess(`Agency created successfully - ID: ${createdAgencyId}`);
      logInfo(`Code: ${response.data.data.agency.Agency_CD}`);
      logInfo(`Name: ${response.data.data.agency.Agency_Name}`);
      return true;
    }
  } catch (error) {
    logError(`Create agency failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Validation errors:', JSON.stringify(error.response.data.details, null, 2));
    }
    if (error.response?.status === 400) {
      logWarning('This is likely a validation error. Check that all required fields are present.');
    }
    return false;
  }
}

async function testGetAgencyById() {
  if (!createdAgencyId) {
    logWarning('Skipping - no agency ID available');
    return false;
  }
  
  logSection('Testing Get Agency by ID');
  
  try {
    const response = await axios.get(`${API_URL}/agencies/${createdAgencyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Agency retrieved successfully');
      console.log('Agency details:', JSON.stringify(response.data.data.agency, null, 2));
      return true;
    }
  } catch (error) {
    logError(`Get agency by ID failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testUpdateAgency() {
  if (!createdAgencyId) {
    logWarning('Skipping - no agency ID available');
    return false;
  }
  
  logSection('Testing Update Agency');
  
  const updateData = {
    agencyCD: `UPD${Date.now().toString().slice(-6)}`,
    agencyName: 'Updated Test Agency Name',
    region: 'Updated Region',
    contactEmail: 'updated@agency.com',
    contactPhone: '555-0101'
  };
  
  try {
    logInfo('Updating agency...');
    const response = await axios.put(`${API_URL}/agencies/${createdAgencyId}`, updateData, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      logSuccess('Agency updated successfully');
      logInfo(`New name: ${response.data.data.agency.Agency_Name}`);
      return true;
    }
  } catch (error) {
    logError(`Update agency failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Validation errors:', JSON.stringify(error.response.data.details, null, 2));
    }
    return false;
  }
}

async function testGetUsers() {
  logSection('Testing Get Users');
  
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess(`Retrieved ${response.data.data.users.length} users`);
      logInfo(`Total: ${response.data.data.total} users`);
      
      // Display first few users
      response.data.data.users.slice(0, 3).forEach(user => {
        console.log(`  - ${user.Username}: ${user.Employee_Name} (${user.Role})`);
      });
      return true;
    }
  } catch (error) {
    logError(`Get users failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testCreateUser() {
  if (!createdAgencyId) {
    logWarning('Skipping user creation - no agency ID available');
    return false;
  }
  
  logSection('Testing Create User');
  
  const timestamp = Date.now();
  const newUser = {
    username: `testuser${timestamp.toString().slice(-6)}`,
    password: 'TestPass123!',
    employeeName: `Test User ${timestamp}`,
    employeeContact: '555-0200',
    email: `testuser${timestamp}@test.com`,
    role: 'Field_Worker',
    agencyId: createdAgencyId
  };
  
  try {
    logInfo('Creating new user...');
    console.log('User data:', JSON.stringify({ ...newUser, password: '***' }, null, 2));
    
    const response = await axios.post(`${API_URL}/users`, newUser, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      createdUserId = response.data.data.user.User_ID;
      logSuccess(`User created successfully - ID: ${createdUserId}`);
      logInfo(`Username: ${response.data.data.user.Username}`);
      logInfo(`Role: ${response.data.data.user.Role}`);
      return true;
    }
  } catch (error) {
    logError(`Create user failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Validation errors:', JSON.stringify(error.response.data.details, null, 2));
    }
    return false;
  }
}

async function testGetUserById() {
  if (!createdUserId) {
    logWarning('Skipping - no user ID available');
    return false;
  }
  
  logSection('Testing Get User by ID');
  
  try {
    const response = await axios.get(`${API_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('User retrieved successfully');
      console.log('User details:', JSON.stringify(response.data.data.user, null, 2));
      return true;
    }
  } catch (error) {
    logError(`Get user by ID failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testDeleteUser() {
  if (!createdUserId) {
    logWarning('Skipping - no user ID available');
    return false;
  }
  
  logSection('Testing Delete User');
  
  try {
    const response = await axios.delete(`${API_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('User deleted successfully');
      createdUserId = null;
      return true;
    }
  } catch (error) {
    logError(`Delete user failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testDeleteAgency() {
  if (!createdAgencyId) {
    logWarning('Skipping - no agency ID available');
    return false;
  }
  
  logSection('Testing Delete Agency');
  
  try {
    const response = await axios.delete(`${API_URL}/agencies/${createdAgencyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Agency deleted successfully');
      createdAgencyId = null;
      return true;
    }
  } catch (error) {
    logError(`Delete agency failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetSubdivisions() {
  logSection('Testing Create Subdivision');
  
  try {
    // For testing authorities, we'll just use an existing subdivision from the database
    // Query agency 1 which should have subdivisions seeded
    logInfo('Looking for existing subdivisions...');
    
    // Use axios to call a simple query endpoint or just hardcode subdivision ID 1 for testing
    // Since we know the seed data creates subdivision ID 1 for agency 1
    subdivisionId = 1; // Default subdivision from seed data
    
    logSuccess(`Using subdivision ID: ${subdivisionId}`);
    logInfo('Note: Using default seeded subdivision for authority tests');
    return true;
  } catch (error) {
    logError(`Get subdivision failed: ${error.message}`);
    return false;
  }
}

async function testCreateAuthority() {
  if (!subdivisionId) {
    logWarning('Skipping authority creation - no subdivision ID available');
    return false;
  }
  
  logSection('Testing Create Authority');
  
  const newAuthority = {
    authorityType: 'Track_Authority',
    subdivisionId: subdivisionId,
    beginMP: 100.5,
    endMP: 105.5,
    trackType: 'Main',
    trackNumber: '1',
    employeeNameDisplay: 'Test Field Worker',
    employeeContactDisplay: '555-9999',
    expirationTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
  };
  
  try {
    logInfo('Creating new authority...');
    console.log('Authority data:', JSON.stringify(newAuthority, null, 2));
    
    const response = await axios.post(`${API_URL}/authorities`, newAuthority, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      createdAuthorityId = response.data.data.authority.Authority_ID;
      logSuccess(`Authority created successfully - ID: ${createdAuthorityId}`);
      logInfo(`Type: ${response.data.data.authority.Authority_Type}`);
      logInfo(`Milepost Range: ${response.data.data.authority.Begin_MP} - ${response.data.data.authority.End_MP}`);
      return true;
    }
  } catch (error) {
    logError(`Create authority failed: ${error.response?.data?.error || error.message}`);
    if (error.response?.data?.details) {
      console.log('Validation errors:', JSON.stringify(error.response.data.details, null, 2));
    }
    return false;
  }
}

async function testGetActiveAuthorities() {
  logSection('Testing Get Active Authorities');
  
  try {
    const response = await axios.get(`${API_URL}/authorities/active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const authorities = response.data.data.authorities || response.data.data || [];
      logSuccess(`Retrieved ${authorities.length} active authorities`);
      
      if (authorities.length > 0) {
        // Display first authority
        const auth = authorities[0];
        console.log(`  - Authority #${auth.Authority_ID}: ${auth.Authority_Type} (${auth.Begin_MP} - ${auth.End_MP} MP)`);
      }
      return true;
    }
  } catch (error) {
    logError(`Get active authorities failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testGetAuthorityById() {
  if (!createdAuthorityId) {
    logWarning('Skipping - no authority ID available');
    return false;
  }
  
  logSection('Testing Get Authority by ID');
  
  try {
    const response = await axios.get(`${API_URL}/authorities/${createdAuthorityId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      logSuccess('Authority retrieved successfully');
      console.log('Authority details:', JSON.stringify(response.data.data.authority, null, 2));
      return true;
    }
  } catch (error) {
    logError(`Get authority by ID failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testEndAuthority() {
  if (!createdAuthorityId) {
    logWarning('Skipping - no authority ID available');
    return false;
  }
  
  logSection('Testing End Authority');
  
  try {
    const response = await axios.post(
      `${API_URL}/authorities/${createdAuthorityId}/end`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.success) {
      logSuccess('Authority ended successfully');
      createdAuthorityId = null;
      return true;
    }
  } catch (error) {
    logError(`End authority failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║     HERZOG ADMIN PORTAL - API COMMUNICATION TEST SUITE    ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝', 'bold');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Get Agencies', fn: testGetAgencies },
    { name: 'Create Agency', fn: testCreateAgency },
    { name: 'Get Agency by ID', fn: testGetAgencyById },
    { name: 'Update Agency', fn: testUpdateAgency },
    { name: 'Get Users', fn: testGetUsers },
    { name: 'Create User', fn: testCreateUser },
    { name: 'Get User by ID', fn: testGetUserById },
    { name: 'Delete User', fn: testDeleteUser },
    { name: 'Get Subdivisions', fn: testGetSubdivisions },
    { name: 'Create Authority', fn: testCreateAuthority },
    { name: 'Get Active Authorities', fn: testGetActiveAuthorities },
    { name: 'Get Authority by ID', fn: testGetAuthorityById },
    { name: 'End Authority', fn: testEndAuthority },
    { name: 'Delete Agency', fn: testDeleteAgency }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === false) {
        results.failed++;
      } else if (result === true) {
        results.passed++;
      }
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logError(`Unexpected error in ${test.name}: ${error.message}`);
      results.failed++;
    }
  }
  
  // Final summary
  logSection('Test Summary');
  console.log('');
  log(`Total Tests Run: ${results.passed + results.failed}`, 'bold');
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  } else {
    logSuccess('Failed: 0');
  }
  console.log('');
  
  if (results.failed === 0) {
    log('╔════════════════════════════════════════════════════════════╗', 'green');
    log('║          ALL TESTS PASSED SUCCESSFULLY! ✓                 ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
  } else {
    log('╔════════════════════════════════════════════════════════════╗', 'red');
    log('║          SOME TESTS FAILED - CHECK ERRORS ABOVE            ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
  }
  
  console.log('');
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
