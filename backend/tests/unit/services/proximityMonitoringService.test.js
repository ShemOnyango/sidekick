// Create shared mock pool
const sharedMockPool = {
  request: jest.fn().mockReturnThis(),
  input: jest.fn().mockReturnThis(),
  query: jest.fn(),
  execute: jest.fn()
};

// Mock database module with getConnection and sql
jest.mock('../../../src/config/database', () => ({
  getConnection: jest.fn(() => sharedMockPool),
  sql: {
    VarChar: 'varchar',
    Int: 'int',
    Float: 'float',
    DateTime: 'datetime'
  },
  poolPromise: Promise.resolve(sharedMockPool)
}));

// Mock geoCalculations
jest.mock('../../../src/utils/geoCalculations', () => ({
  calculateDistance: jest.fn(),
  calculateTrackDistance: jest.fn()
}));

// Mock socket
jest.mock('../../../src/config/socket', () => ({
  emitToUser: jest.fn(),
  emitToAuthority: jest.fn()
}));

const { calculateTrackDistance } = require('../../../src/utils/geoCalculations');
const socketConfig = require('../../../src/config/socket');
const proximityMonitoringService = require('../../../src/services/proximityMonitoringService');

describe('Proximity Monitoring Service', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = sharedMockPool;
    
    // Reset all mocks
    mockPool.request.mockClear().mockReturnThis();
    mockPool.input.mockClear().mockReturnThis();
    mockPool.query.mockClear();
    mockPool.execute.mockClear();
    calculateTrackDistance.mockClear();
    socketConfig.emitToUser.mockClear();
    socketConfig.emitToAuthority.mockClear();

    jest.useFakeTimers();
  });

  afterEach(() => {
    proximityMonitoringService.stop();
    jest.useRealTimers();
  });

  describe('start', () => {
    it('should start monitoring service', () => {
      proximityMonitoringService.start();

      expect(proximityMonitoringService.monitoringInterval).not.toBeNull();
    });

    it('should not start if already running', () => {
      proximityMonitoringService.start();
      const firstInterval = proximityMonitoringService.monitoringInterval;

      proximityMonitoringService.start();
      const secondInterval = proximityMonitoringService.monitoringInterval;

      expect(firstInterval).toBe(secondInterval);
    });
  });

  describe('stop', () => {
    it('should stop monitoring service', () => {
      proximityMonitoringService.start();
      expect(proximityMonitoringService.monitoringInterval).not.toBeNull();

      proximityMonitoringService.stop();

      expect(proximityMonitoringService.monitoringInterval).toBeNull();
    });
  });

  describe('checkAllProximities', () => {
    it('should check proximities for active authorities', async () => {
      const mockAuthorities = [
        {
          Authority_ID: 1,
          User_ID: 1,
          Employee_Name_Display: 'Worker 1',
          Employee_Contact_Display: '555-0001',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_Latitude: 40.7128,
          Latest_Longitude: -74.0060,
          Latest_MP: 10.5
        },
        {
          Authority_ID: 2,
          User_ID: 2,
          Employee_Name_Display: 'Worker 2',
          Employee_Contact_Display: '555-0002',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_Latitude: 40.7138,
          Latest_Longitude: -74.0070,
          Latest_MP: 10.7
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(0.2); // 0.2 miles = critical threshold

      await proximityMonitoringService.checkAllProximities();

      expect(mockPool.query).toHaveBeenCalled();
      expect(socketConfig.emitToUser).toHaveBeenCalled();
    });

    it('should not alert if distance is greater than 1 mile', async () => {
      const mockAuthorities = [
        {
          Authority_ID: 1,
          User_ID: 1,
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 10.0
        },
        {
          Authority_ID: 2,
          User_ID: 2,
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 12.0
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(2.0); // 2 miles - no alert

      await proximityMonitoringService.checkAllProximities();

      expect(socketConfig.emitToUser).not.toHaveBeenCalled();
    });

    it('should respect cooldown period', async () => {
      const mockAuthorities = [
        {
          Authority_ID: 1,
          User_ID: 1,
          Employee_Name_Display: 'Worker 1',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 10.0
        },
        {
          Authority_ID: 2,
          User_ID: 2,
          Employee_Name_Display: 'Worker 2',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 10.2
        }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(0.2); // Critical

      // First check - should send alert
      await proximityMonitoringService.checkAllProximities();
      const firstCallCount = socketConfig.emitToUser.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      socketConfig.emitToUser.mockClear();

      // Second check immediately - should not send (cooldown)
      await proximityMonitoringService.checkAllProximities();
      expect(socketConfig.emitToUser).not.toHaveBeenCalled();

      // Advance time past cooldown
      jest.advanceTimersByTime(61000); // 61 seconds

      // Third check - should send again
      await proximityMonitoringService.checkAllProximities();
      expect(socketConfig.emitToUser).toHaveBeenCalled();
    });
  });

  describe('getProximityStatus', () => {
    it('should return nearby authorities', async () => {
      const authorityId = 1;
      const mockAuthorities = [
        {
          Authority_ID: 1,
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 10.0
        },
        {
          Authority_ID: 2,
          Employee_Name_Display: 'Worker 2',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Latest_MP: 10.5
        }
      ];

      mockPool.query
        .mockResolvedValueOnce({ recordset: [mockAuthorities[0]] }) // Current authority
        .mockResolvedValueOnce({ recordset: [mockAuthorities[1]] }); // Overlapping authorities

      calculateTrackDistance.mockReturnValue(0.5); // Warning level

      const result = await proximityMonitoringService.getProximityStatus(authorityId);

      expect(result).toEqual({
        authorityId: 1,
        nearbyAuthorities: [
          expect.objectContaining({
            authorityId: 2,
            distance: 0.5,
            alertLevel: 'Warning'
          })
        ],
        lastChecked: expect.any(Date)
      });
    });

    it('should return empty array if no nearby authorities', async () => {
      const authorityId = 1;
      mockPool.query
        .mockResolvedValueOnce({
          recordset: [{
            Authority_ID: 1,
            Subdivision_Code: 'SUB1',
            Track_Type: 'Main',
            Track_Number: '1'
          }]
        })
        .mockResolvedValueOnce({ recordset: [] });

      const result = await proximityMonitoringService.getProximityStatus(authorityId);

      expect(result.nearbyAuthorities).toEqual([]);
    });
  });

  describe('Alert Level Thresholds', () => {
    it('should trigger Critical alert at 0.25 miles', async () => {
      const mockAuthorities = [
        { Authority_ID: 1, User_ID: 1, Employee_Name_Display: 'Worker 1', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 10.0 },
        { Authority_ID: 2, User_ID: 2, Employee_Name_Display: 'Worker 2', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 10.25 }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(0.25);

      await proximityMonitoringService.checkAllProximities();

      expect(socketConfig.emitToUser).toHaveBeenCalledWith(
        expect.anything(),
        'proximity_alert',
        expect.objectContaining({
          level: 'Critical'
        })
      );
    });

    it('should trigger Warning alert at 0.5 miles', async () => {
      const mockAuthorities = [
        { Authority_ID: 1, User_ID: 1, Employee_Name_Display: 'Worker 1', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 10.0 },
        { Authority_ID: 2, User_ID: 2, Employee_Name_Display: 'Worker 2', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 10.5 }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(0.5);

      await proximityMonitoringService.checkAllProximities();

      expect(socketConfig.emitToUser).toHaveBeenCalledWith(
        expect.anything(),
        'proximity_alert',
        expect.objectContaining({
          level: 'Warning'
        })
      );
    });

    it('should trigger Info alert at 1.0 mile', async () => {
      const mockAuthorities = [
        { Authority_ID: 1, User_ID: 1, Employee_Name_Display: 'Worker 1', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 10.0 },
        { Authority_ID: 2, User_ID: 2, Employee_Name_Display: 'Worker 2', Subdivision_Code: 'SUB1', Track_Type: 'Main', Track_Number: '1', Latest_MP: 11.0 }
      ];

      mockPool.query.mockResolvedValue({ recordset: mockAuthorities });
      calculateTrackDistance.mockReturnValue(1.0);

      await proximityMonitoringService.checkAllProximities();

      expect(socketConfig.emitToUser).toHaveBeenCalledWith(
        expect.anything(),
        'proximity_alert',
        expect.objectContaining({
          level: 'Info'
        })
      );
    });
  });
});
