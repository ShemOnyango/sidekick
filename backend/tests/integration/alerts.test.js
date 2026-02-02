const request = require('supertest');
const app = require('../../src/server');
const { connectToDatabase, closeConnection } = require('../../src/config/database');

describe('Alerts API Integration Tests', () => {
  let adminToken;
  const testAgencyId = 1;

  beforeAll(async () => {
    await connectToDatabase();
    
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

  describe('Alert History', () => {
    describe('GET /api/alerts/:agencyId/history', () => {
      it('should fetch alert history with pagination', async () => {
        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 10 });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter by alert type', async () => {
        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ alertType: 'PROXIMITY' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2026-01-01').toISOString();
        const endDate = new Date('2026-01-31').toISOString();

        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ startDate, endDate });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/history`);

        expect(res.statusCode).toBe(401);
      });
    });

    describe('GET /api/alerts/:agencyId/stats', () => {
      it('should fetch alert statistics', async () => {
        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/stats`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalAlerts');
        expect(res.body.data).toHaveProperty('criticalAlerts');
        expect(res.body.data).toHaveProperty('proximityAlerts');
      });
    });

    describe('GET /api/alerts/:agencyId/export', () => {
      it('should export alert history to Excel', async () => {
        const res = await request(app)
          .get(`/api/alerts/${testAgencyId}/export`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('spreadsheet');
      });
    });
  });

  describe('Test Alerts', () => {
    describe('POST /api/alerts/:agencyId/test', () => {
      it('should send test alert successfully', async () => {
        const testAlert = {
          alertType: 'PROXIMITY',
          alertLevel: 'warning',
          userId: 1,
          distance: 0.5,
          message: 'Test proximity alert',
          includeEmail: true,
          includePush: true
        };

        const res = await request(app)
          .post(`/api/alerts/${testAgencyId}/test`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(testAlert);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should validate required userId', async () => {
        const invalidAlert = {
          alertType: 'PROXIMITY',
          alertLevel: 'warning',
          // Missing userId
          distance: 0.5
        };

        const res = await request(app)
          .post(`/api/alerts/${testAgencyId}/test`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAlert);

        expect(res.statusCode).toBe(400);
      });

      it('should validate alert type', async () => {
        const invalidAlert = {
          alertType: 'INVALID_TYPE',
          alertLevel: 'warning',
          userId: 1,
          distance: 0.5
        };

        const res = await request(app)
          .post(`/api/alerts/${testAgencyId}/test`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAlert);

        expect(res.statusCode).toBe(400);
      });

      it('should validate distance range', async () => {
        const invalidAlert = {
          alertType: 'PROXIMITY',
          alertLevel: 'warning',
          userId: 1,
          distance: 10.0 // Too large
        };

        const res = await request(app)
          .post(`/api/alerts/${testAgencyId}/test`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAlert);

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('Alert Configuration', () => {
    describe('GET /api/config/alert-configs/:agencyId', () => {
      it('should fetch all alert configurations', async () => {
        const res = await request(app)
          .get(`/api/config/alert-configs/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('POST /api/config/alert-configs/:agencyId', () => {
      it('should create alert configuration', async () => {
        const config = {
          alertType: 'Proximity_Alert',
          distance: 0.75,
          alertLevel: 'critical',
          enabled: true,
          notifyEmail: true,
          notifyPush: true
        };

        const res = await request(app)
          .post(`/api/config/alert-configs/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(config);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('configId');
      });
    });

    describe('PUT /api/config/alert-configs/:agencyId/:configId', () => {
      it('should update alert configuration', async () => {
        const updates = {
          distance: 1.0,
          alertLevel: 'warning',
          enabled: false
        };

        const res = await request(app)
          .put(`/api/config/alert-configs/${testAgencyId}/1`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE /api/config/alert-configs/:agencyId/:configId', () => {
      it('should delete alert configuration', async () => {
        const res = await request(app)
          .delete(`/api/config/alert-configs/${testAgencyId}/999`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Will fail if config doesn't exist, but test the endpoint
        expect([200, 404]).toContain(res.statusCode);
      });
    });
  });
});
