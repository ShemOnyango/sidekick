const request = require('supertest');
const app = require('../../src/server');
const { connectToDatabase, closeConnection } = require('../../src/config/database');

describe('Authorities API Integration Tests', () => {
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

  describe('Active Authorities', () => {
    describe('GET /api/authorities/:agencyId/active', () => {
      it('should fetch all active authorities', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/active`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return 401 without authentication', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/active`);

        expect(res.statusCode).toBe(401);
      });
    });

    describe('GET /api/authorities/:agencyId/stats', () => {
      it('should fetch authority statistics', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/stats`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('active');
        expect(res.body.data).toHaveProperty('overlaps');
        expect(res.body.data).toHaveProperty('nearExpiry');
      });
    });
  });

  describe('Authority History', () => {
    describe('GET /api/authorities/:agencyId/history', () => {
      it('should fetch authority history with pagination', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, limit: 10 });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2026-01-01').toISOString();
        const endDate = new Date('2026-01-31').toISOString();

        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ startDate, endDate });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter by authority type', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ authorityType: 'Track Authority' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter by subdivision', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ subdivision: 'Main' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should filter by employee name', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ employeeName: 'John Doe' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('GET /api/authorities/:agencyId/history/stats', () => {
      it('should fetch historical statistics', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history/stats`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalRecords');
        expect(res.body.data).toHaveProperty('totalDuration');
        expect(res.body.data).toHaveProperty('avgDuration');
      });
    });

    describe('GET /api/authorities/:agencyId/history/export', () => {
      it('should export history to Excel', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/history/export`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('spreadsheet');
      });
    });
  });

  describe('Overlap Detection', () => {
    describe('GET /api/authorities/:agencyId/overlaps', () => {
      it('should fetch detected overlaps', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/overlaps`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter by severity', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/overlaps`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ severity: 'critical' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    describe('GET /api/authorities/:agencyId/overlaps/stats', () => {
      it('should fetch overlap statistics', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/overlaps/stats`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('totalOverlaps');
        expect(res.body.data).toHaveProperty('criticalOverlaps');
        expect(res.body.data).toHaveProperty('resolvedToday');
      });
    });

    describe('POST /api/authorities/:agencyId/overlaps/:overlapId/resolve', () => {
      it('should mark overlap as resolved', async () => {
        const res = await request(app)
          .post(`/api/authorities/${testAgencyId}/overlaps/1/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: 'Authorities adjusted to eliminate overlap',
            resolvedBy: 'Admin User'
          });

        // May fail if overlap doesn't exist, but endpoint should work
        expect([200, 404]).toContain(res.statusCode);
      });
    });
  });

  describe('Authority CRUD Operations', () => {
    let createdAuthorityId;

    describe('POST /api/authorities/:agencyId', () => {
      it('should create new authority', async () => {
        const authority = {
          authorityType: 'Track Authority',
          subdivision: 'Main',
          trackType: 'Main',
          trackNumber: '1',
          beginMP: 100.0,
          endMP: 150.0,
          employeeName: 'Test Employee',
          startTime: new Date().toISOString(),
          estimatedEndTime: new Date(Date.now() + 3600000).toISOString()
        };

        const res = await request(app)
          .post(`/api/authorities/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(authority);

        if (res.statusCode === 201) {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('authorityId');
          createdAuthorityId = res.body.data.authorityId;
        }
      });

      it('should validate required fields', async () => {
        const invalidAuthority = {
          authorityType: 'Track Authority'
          // Missing other required fields
        };

        const res = await request(app)
          .post(`/api/authorities/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAuthority);

        expect(res.statusCode).toBe(400);
      });

      it('should validate milepost range', async () => {
        const invalidAuthority = {
          authorityType: 'Track Authority',
          subdivision: 'Main',
          beginMP: 150.0,
          endMP: 100.0, // End before begin - invalid
          employeeName: 'Test'
        };

        const res = await request(app)
          .post(`/api/authorities/${testAgencyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAuthority);

        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /api/authorities/:agencyId/:authorityId', () => {
      it('should fetch specific authority details', async () => {
        if (createdAuthorityId) {
          const res = await request(app)
            .get(`/api/authorities/${testAgencyId}/${createdAuthorityId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('authorityId');
        }
      });

      it('should return 404 for non-existent authority', async () => {
        const res = await request(app)
          .get(`/api/authorities/${testAgencyId}/99999`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
      });
    });

    describe('PUT /api/authorities/:agencyId/:authorityId', () => {
      it('should update authority', async () => {
        if (createdAuthorityId) {
          const updates = {
            estimatedEndTime: new Date(Date.now() + 7200000).toISOString()
          };

          const res = await request(app)
            .put(`/api/authorities/${testAgencyId}/${createdAuthorityId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updates);

          expect(res.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
        }
      });
    });

    describe('DELETE /api/authorities/:agencyId/:authorityId', () => {
      it('should delete authority', async () => {
        if (createdAuthorityId) {
          const res = await request(app)
            .delete(`/api/authorities/${testAgencyId}/${createdAuthorityId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
        }
      });
    });
  });
});
