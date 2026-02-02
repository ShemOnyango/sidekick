// Create shared mock pool
const sharedMockPool = {
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn()
};

// Mock database
jest.mock('../../../src/config/database', () => ({
  getConnection: jest.fn(() => sharedMockPool),
  sql: {
    VarChar: 'varchar',
    Int: 'int',
    Float: 'float',
    DateTime: 'datetime',
    Decimal: 'decimal'
  }
}));

// Mock geoCalculations
jest.mock('../../../src/utils/geoCalculations');

// Mock socket
jest.mock('../../../src/config/socket', () => ({
  emitToAuthority: jest.fn()
}));

const { calculateDistance } = require('../../../src/utils/geoCalculations');
const gpsService = require('../../../src/services/gpsService');

describe('GPS Service', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = sharedMockPool;
    mockPool.request.mockClear().mockReturnThis();
    mockPool.input.mockClear().mockReturnThis();
    mockPool.query.mockClear();
    calculateDistance.mockClear();
  });

  describe('updateGPSLocation', () => {
    it('should update GPS location for authority', async () => {
      const authorityId = 1;
      const gpsData = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        speed: 5
      };

      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      const result = await gpsService.updateGPSLocation(authorityId, gpsData);

      expect(mockPool.input).toHaveBeenCalledWith('authorityId', expect.anything(), authorityId);
      expect(mockPool.input).toHaveBeenCalledWith('latitude', expect.anything(), gpsData.latitude);
      expect(mockPool.input).toHaveBeenCalledWith('longitude', expect.anything(), gpsData.longitude);
      expect(result).toBeDefined();
    });

    it('should calculate milepost from GPS coordinates', async () => {
      const authorityId = 1;
      const gpsData = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      // Mock authority with track info
      mockPool.query
        .mockResolvedValueOnce({
          recordset: [{
            Subdivision_Code: 'SUB1',
            Track_Type: 'Main',
            Track_Number: '1',
            Begin_MP: 10.0,
            End_MP: 20.0
          }]
        })
        .mockResolvedValueOnce({
          recordset: [
            { MP: 10.0, Latitude: 40.7100, Longitude: -74.0050 },
            { MP: 15.0, Latitude: 40.7150, Longitude: -74.0070 }
          ]
        })
        .mockResolvedValueOnce({ rowsAffected: [1] });

      calculateDistance
        .mockReturnValueOnce(0.2) // Distance to MP 10
        .mockReturnValueOnce(0.15); // Distance to MP 15

      await gpsService.updateGPSLocation(authorityId, gpsData);

      expect(calculateDistance).toHaveBeenCalled();
    });

    it('should handle GPS update errors gracefully', async () => {
      const authorityId = 1;
      const gpsData = { latitude: 40.7128, longitude: -74.0060 };

      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        gpsService.updateGPSLocation(authorityId, gpsData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getGPSHistory', () => {
    it('should retrieve GPS history for authority', async () => {
      const authorityId = 1;
      const mockHistory = [
        {
          GPS_Log_ID: 1,
          Latitude: 40.7128,
          Longitude: -74.0060,
          Calculated_MP: 10.5,
          Timestamp: new Date()
        },
        {
          GPS_Log_ID: 2,
          Latitude: 40.7138,
          Longitude: -74.0070,
          Calculated_MP: 10.7,
          Timestamp: new Date()
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockHistory });

      const result = await gpsService.getGPSHistory(authorityId);

      expect(mockPool.input).toHaveBeenCalledWith('authorityId', expect.anything(), authorityId);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('Latitude', 40.7128);
    });

    it('should filter GPS history by time range', async () => {
      const authorityId = 1;
      const startTime = new Date('2026-01-29T00:00:00Z');
      const endTime = new Date('2026-01-29T23:59:59Z');

      mockPool.query.mockResolvedValue({ recordset: [] });

      await gpsService.getGPSHistory(authorityId, startTime, endTime);

      expect(mockPool.input).toHaveBeenCalledWith('startTime', expect.anything(), startTime);
      expect(mockPool.input).toHaveBeenCalledWith('endTime', expect.anything(), endTime);
    });

    it('should return empty array if no history found', async () => {
      mockPool.query.mockResolvedValue({ recordset: [] });

      const result = await gpsService.getGPSHistory(999);

      expect(result).toEqual([]);
    });
  });

  describe('calculateNearestMilepost', () => {
    it('should find nearest milepost to GPS coordinates', async () => {
      const latitude = 40.7128;
      const longitude = -74.0060;
      const trackInfo = {
        subdivisionCode: 'SUB1',
        trackType: 'Main',
        trackNumber: '1'
      };

      const mockMileposts = [
        { MP: 10.0, Latitude: 40.7100, Longitude: -74.0050 },
        { MP: 11.0, Latitude: 40.7150, Longitude: -74.0070 },
        { MP: 12.0, Latitude: 40.7200, Longitude: -74.0090 }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockMileposts });

      calculateDistance
        .mockReturnValueOnce(0.2)  // Distance to MP 10
        .mockReturnValueOnce(0.15) // Distance to MP 11 (closest)
        .mockReturnValueOnce(0.5); // Distance to MP 12

      const result = await gpsService.calculateNearestMilepost(
        latitude,
        longitude,
        trackInfo
      );

      expect(result).toEqual({
        milepost: 11.0,
        distance: 0.15
      });
    });

    it('should interpolate between mileposts for accurate position', async () => {
      const latitude = 40.7125;
      const longitude = -74.0060;
      const trackInfo = {
        subdivisionCode: 'SUB1',
        trackType: 'Main',
        trackNumber: '1'
      };

      const mockMileposts = [
        { MP: 10.0, Latitude: 40.7100, Longitude: -74.0050 },
        { MP: 11.0, Latitude: 40.7150, Longitude: -74.0070 }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockMileposts });
      calculateDistance.mockReturnValue(0.1);

      const result = await gpsService.calculateNearestMilepost(
        latitude,
        longitude,
        trackInfo
      );

      expect(result.milepost).toBeGreaterThanOrEqual(10.0);
      expect(result.milepost).toBeLessThanOrEqual(11.0);
    });

    it('should handle track with no milepost data', async () => {
      mockPool.query.mockResolvedValue({ recordset: [] });

      const result = await gpsService.calculateNearestMilepost(
        40.7128,
        -74.0060,
        { subdivisionCode: 'SUB1', trackType: 'Main', trackNumber: '1' }
      );

      expect(result).toBeNull();
    });
  });

  describe('checkBoundaryViolation', () => {
    it('should detect when worker exceeds authority boundary', async () => {
      const authorityId = 1;
      const currentMP = 20.5;

      mockPool.query.mockResolvedValue({
        recordset: [{
          Begin_MP: 10.0,
          End_MP: 20.0
        }]
      });

      const result = await gpsService.checkBoundaryViolation(authorityId, currentMP);

      expect(result).toEqual({
        isViolation: true,
        exceedsBy: 0.5,
        boundary: 'end'
      });
    });

    it('should detect when worker is before authority start', async () => {
      const authorityId = 1;
      const currentMP = 9.5;

      mockPool.query.mockResolvedValue({
        recordset: [{
          Begin_MP: 10.0,
          End_MP: 20.0
        }]
      });

      const result = await gpsService.checkBoundaryViolation(authorityId, currentMP);

      expect(result).toEqual({
        isViolation: true,
        exceedsBy: 0.5,
        boundary: 'start'
      });
    });

    it('should return no violation when within boundaries', async () => {
      const authorityId = 1;
      const currentMP = 15.0;

      mockPool.query.mockResolvedValue({
        recordset: [{
          Begin_MP: 10.0,
          End_MP: 20.0
        }]
      });

      const result = await gpsService.checkBoundaryViolation(authorityId, currentMP);

      expect(result).toEqual({
        isViolation: false,
        exceedsBy: 0,
        boundary: null
      });
    });
  });

  describe('getActiveGPSLocations', () => {
    it('should retrieve all active GPS locations for agency', async () => {
      const agencyId = 1;
      const mockLocations = [
        {
          Authority_ID: 1,
          User_ID: 1,
          Employee_Name: 'Worker 1',
          Latest_Latitude: 40.7128,
          Latest_Longitude: -74.0060,
          Calculated_MP: 10.5,
          Last_Update: new Date()
        },
        {
          Authority_ID: 2,
          User_ID: 2,
          Employee_Name: 'Worker 2',
          Latest_Latitude: 40.7138,
          Latest_Longitude: -74.0070,
          Calculated_MP: 11.0,
          Last_Update: new Date()
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockLocations });

      const result = await gpsService.getActiveGPSLocations(agencyId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('Employee_Name', 'Worker 1');
    });

    it('should filter out stale GPS data', async () => {
      const agencyId = 1;
      const mockLocations = [
        {
          Authority_ID: 1,
          Latest_Latitude: 40.7128,
          Latest_Longitude: -74.0060,
          Last_Update: new Date() // Recent
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockLocations });

      const result = await gpsService.getActiveGPSLocations(agencyId);

      // Should only include recent updates (within 5 minutes)
      expect(result).toBeDefined();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DATEADD')
      );
    });
  });

  describe('Performance & Accuracy', () => {
    it('should handle rapid GPS updates efficiently', async () => {
      const authorityId = 1;
      const updates = Array.from({ length: 100 }, (_, i) => ({
        latitude: 40.7128 + (i * 0.0001),
        longitude: -74.0060 + (i * 0.0001)
      }));

      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      const promises = updates.map(gpsData =>
        gpsService.updateGPSLocation(authorityId, gpsData)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should maintain accuracy with high-precision coordinates', async () => {
      const authorityId = 1;
      const highPrecisionGPS = {
        latitude: 40.71280123456789,
        longitude: -74.00601234567890
      };

      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      await gpsService.updateGPSLocation(authorityId, highPrecisionGPS);

      expect(mockPool.input).toHaveBeenCalledWith(
        'latitude',
        expect.anything(),
        highPrecisionGPS.latitude
      );
    });
  });
});
