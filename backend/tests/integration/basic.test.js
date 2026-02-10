const request = require('supertest');
const app = require('../../src/server');
const { connectToDatabase, closeConnection } = require('../../src/config/database');

describe('Sidekick API', () => {
  let adminToken;

  beforeAll(async () => {
    try {
      console.log('Connecting to database...');
      await connectToDatabase();
      console.log('Database connected successfully');
      
      // Login as admin to get token for all tests
      console.log('Attempting admin login...');
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      console.log('Login response status:', res.statusCode);
      console.log('Login response body:', JSON.stringify(res.body, null, 2));
      
      if (res.statusCode === 200 && res.body.success && res.body.data && res.body.data.token) {
        adminToken = res.body.data.token;
        console.log('Admin token obtained successfully');
        console.log('Token length:', adminToken.length);
      } else {
        throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
      }
    } catch (error) {
      console.error('Setup failed:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await closeConnection();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  });

  describe('Health Check', () => {
    it('should return API health status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'Sidekick API');
    });
  });

  describe('Authentication', () => {
    let testAuthToken;

    it('should login with admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      console.log('Auth test - Login response:', {
        status: res.statusCode,
        hasToken: !!(res.body.data && res.body.data.token),
        tokenLength: res.body.data?.token?.length || 0
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('Username', 'admin');

      testAuthToken = res.body.data.token;
    });

    it('should get profile with valid token', async () => {
      // Use the token we just obtained from login test
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testAuthToken}`);

      console.log('Profile test - Response status:', res.statusCode);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.user).toHaveProperty('Username', 'admin');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-123');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should fail with no token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Agencies', () => {
    it('should get all agencies with admin token', async () => {
      console.log('Agencies test - Using token:', adminToken ? `Token exists (${adminToken.length} chars)` : 'No token');
      
      const res = await request(app)
        .get('/api/agencies')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('Agencies test - Response status:', res.statusCode);
      
      // Check for both 200 (success) or 401 (unauthorized) - we need to know which
      if (res.statusCode === 401) {
        console.log('Agencies test - Unauthorized response:', res.body);
      }
      
      // Expect success with valid admin token
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('agencies');
    });

    it('should fail to get agencies without token', async () => {
      const res = await request(app)
        .get('/api/agencies');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // Optional: Add more debugging tests
  describe('Debug Endpoints', () => {
    it('should check login endpoint structure', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      console.log('Debug - Full login response structure:');
      console.log('- Status:', res.statusCode);
      console.log('- Has success property:', Object.hasOwn(res.body, 'success'));
      console.log('- Success value:', res.body.success);
      console.log('- Has data property:', Object.hasOwn(res.body, 'data'));
      console.log('- Data has token:', res.body.data && Object.hasOwn(res.body.data, 'token'));
      console.log('- Token type:', typeof (res.body.data?.token));
      
      // Just log, don't assert - this is for debugging
    });
  });
});