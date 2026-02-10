// Test script to diagnose mobile app login issues
const axios = require('axios');

// Test configuration
const API_URL = 'http://192.168.212.208:5000/api';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

console.log('🔍 Mobile Login Test Script');
console.log('============================\n');

async function testConnection() {
  console.log('1️⃣ Testing network connectivity...');
  console.log(`   Target: ${API_URL}\n`);
  
  // Test 1: Health check
  try {
    console.log('   Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/api/health`, {
      timeout: 5000
    });
    console.log('   ✅ Health check successful:', healthResponse.data);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   ⚠️  Connection refused - backend might not be running');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('   ⚠️  Timeout - network might be blocked or slow');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   ⚠️  Host not found - check IP address');
    }
    console.log('   Full error:', error);
  }
  
  console.log('\n2️⃣ Testing login endpoint...');
  
  // Test 2: Login
  try {
    console.log(`   Attempting login with username: ${USERNAME}`);
    console.log(`   URL: ${API_URL}/auth/login`);
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: USERNAME,
      password: PASSWORD
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('   ✅ Login successful!');
    console.log('   Response:', JSON.stringify(loginResponse.data, null, 2));
    
  } catch (error) {
    console.log('   ❌ Login failed');
    
    if (error.response) {
      // Server responded with error
      console.log('   Server responded with error:');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.log('   No response received from server');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n   💡 Troubleshooting:');
        console.log('      - Make sure backend is running (npm run dev in backend folder)');
        console.log('      - Check if port 5000 is in use');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.log('\n   💡 Troubleshooting:');
        console.log('      - Check firewall settings');
        console.log('      - Verify phone and computer are on same WiFi');
        console.log('      - Try: netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5000');
      } else if (error.code === 'ENOTFOUND') {
        console.log('\n   💡 Troubleshooting:');
        console.log('      - IP address might be wrong');
        console.log('      - Run: ipconfig to verify your current IP');
      }
    } else {
      console.log('   Unexpected error:', error.message);
    }
  }
  
  console.log('\n============================');
  console.log('Test complete!\n');
}

testConnection();
