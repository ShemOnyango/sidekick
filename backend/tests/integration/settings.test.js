const request = require('supertest');
const app = require('../../src/server');
const { connectToDatabase, closeConnection } = require('../../src/config/database');

describe('Settings API Integration Tests', () => {
  let adminToken;
  const testAgencyId = 1;

  beforeAll(async () => {
    await connectToDatabase();
    
    // Login to get admin token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    if (res.body.success && res.body.data && res.body.data.token) {
      adminToken = res.body.data.token;
    }
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('Authority Field Configuration', () => {
    describe('GET /api/config/authority-fields/:agencyId', () => {
      it('should fetch authority field configuration', async () => {
        const res = await request(app)
          .get(`/api/config/authority-fields/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        const res = await request(app)
          .get(`/api/config/authority-fields/${testAgencyId}`);

        expect(res.statusCode).toBe(401);
      });
    });

    describe('PUT /api/config/authority-fields/:agencyId', () => {
      it('should update authority field configuration', async () => {
        const fieldConfig = {
          fieldName: 'authorityType',
          label: 'Authority Type (Updated)',
          enabled: true,
          required: true
        };

        const res = await request(app)
          .put(`/api/config/authority-fields/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fields: [fieldConfig] });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should validate required fields', async () => {
        const res = await request(app)
          .put(`/api/config/authority-fields/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ fields: [{ invalidField: 'test' }] });

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('Alert Distance Configuration', () => {
    describe('GET /api/config/alert-configs/:agencyId', () => {
      it('should fetch alert configurations', async () => {
        const res = await request(app)
          .get(`/api/config/alert-configs/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('POST /api/config/alert-configs/:agencyId', () => {
      it('should create new alert configuration', async () => {
        const alertConfig = {
          alertType: 'Proximity_Alert',
          distance: 0.5,
          alertLevel: 'warning',
          enabled: true
        };

        const res = await request(app)
          .post(`/api/config/alert-configs/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(alertConfig);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('configId');
      });

      it('should validate distance range (0.25-1.0)', async () => {
        const invalidConfig = {
          alertType: 'Proximity_Alert',
          distance: 5.0, // Invalid - too large
          alertLevel: 'warning'
        };

        const res = await request(app)
          .post(`/api/config/alert-configs/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidConfig);

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('Pin Type Configuration', () => {
    describe('GET /api/config/pin-types/:agencyId', () => {
      it('should fetch pin type configurations', async () => {
        const res = await request(app)
          .get(`/api/config/pin-types/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('POST /api/config/pin-types/:agencyId', () => {
      it('should create new pin type', async () => {
        const pinType = {
          name: 'Test Hazard',
          category: 'Safety Hazard',
          color: '#FF0000',
          iconUrl: 'https://example.com/icon.png',
          sortOrder: 10
        };

        const res = await request(app)
          .post(`/api/config/pin-types/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pinType);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
      });

      it('should validate color format', async () => {
        const invalidPinType = {
          name: 'Test',
          category: 'Test',
          color: 'invalid-color', // Invalid format
          sortOrder: 1
        };

        const res = await request(app)
          .post(`/api/config/pin-types/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidPinType);

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('Branding Configuration', () => {
    describe('GET /api/branding/:agencyId', () => {
      it('should fetch branding configuration', async () => {
        const res = await request(app)
          .get(`/api/branding/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('PUT /api/branding/:agencyId', () => {
      it('should update branding configuration', async () => {
        const branding = {
          primaryColor: '#FFD100',
          secondaryColor: '#000000',
          accentColor: '#FFFFFF',
          agencyName: 'Herzog Rail Test',
          theme: 'dark'
        };

        const res = await request(app)
          .put(`/api/branding/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(branding);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should validate hex color format', async () => {
        const invalidBranding = {
          primaryColor: 'not-a-color',
          secondaryColor: '#000000'
        };

        const res = await request(app)
          .put(`/api/branding/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidBranding);

        expect(res.statusCode).toBe(400);
      });
    });
  });
});
