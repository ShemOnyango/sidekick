const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAlertsAPI() {
  try {
    console.log('=== Testing Alerts API ===\n');
    
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✓ Login successful');
    console.log('User ID:', user.User_ID);
    console.log('Username:', user.Username);
    console.log('Token:', token.substring(0, 20) + '...\n');
    
    // Step 2: Get user alerts
    console.log('Step 2: Fetching user alerts...');
    const alertsResponse = await axios.get(`${BASE_URL}/alerts/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        limit: 50,
        unreadOnly: false
      }
    });
    
    console.log('✓ Alerts response received');
    console.log('Success:', alertsResponse.data.success);
    console.log('Data structure:', JSON.stringify(alertsResponse.data, null, 2));
    
    if (alertsResponse.data.success) {
      const { alerts, count, unreadCount } = alertsResponse.data.data;
      console.log('\n--- Alert Summary ---');
      console.log('Total alerts:', count);
      console.log('Unread alerts:', unreadCount);
      console.log('Alerts array length:', alerts?.length || 0);
      
      if (alerts && alerts.length > 0) {
        console.log('\n--- First Alert ---');
        console.log(JSON.stringify(alerts[0], null, 2));
      } else {
        console.log('\nNo alerts found for this user.');
      }
    }
    
    console.log('\n=== Test completed successfully ===');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    }
    console.error('Stack:', error.stack);
  }
}

testAlertsAPI();
