const { 
  calculateDistance, 
  calculateBearing
} = require('../../../src/utils/geoCalculations');

describe('Geo Calculations Utilities', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points in miles', () => {
      // New York to Los Angeles (approximately 2451 miles)
      const point1 = { latitude: 40.7128, longitude: -74.0060 };
      const point2 = { latitude: 34.0522, longitude: -118.2437 };

      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );

      expect(distance).toBeCloseTo(2451, 0); // Within 1 mile
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points about 1 mile apart
      const point1 = { latitude: 40.7128, longitude: -74.0060 };
      const point2 = { latitude: 40.7273, longitude: -74.0060 };

      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude
      );

      expect(distance).toBeCloseTo(1, 0);
    });

    it('should handle negative coordinates', () => {
      const distance = calculateDistance(
        -33.8688,
        151.2093, // Sydney
        -34.6037,
        -58.3816  // Buenos Aires
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeCloseTo(7330, 10); // Approximately 7330 miles
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points', () => {
      // New York to London (approximately 51 degrees)
      const bearing = calculateBearing(
        40.7128, -74.0060, // New York
        51.5074, -0.1278   // London
      );

      expect(bearing).toBeGreaterThan(0);
      expect(bearing).toBeLessThan(360);
      expect(bearing).toBeCloseTo(51, 5);
    });

    it('should return 0 for same coordinates', () => {
      const bearing = calculateBearing(40.7128, -74.0060, 40.7128, -74.0060);
      expect(bearing).toBe(0);
    });

    it('should calculate bearing for points going south', () => {
      const bearing = calculateBearing(
        40.7128, -74.0060, // New York
        25.7617, -80.1918  // Miami (south)
      );

      expect(bearing).toBeGreaterThan(150);
      expect(bearing).toBeLessThan(210);
    });

    it('should calculate bearing for points going west', () => {
      const bearing = calculateBearing(
        40.7128, -74.0060,  // New York
        40.7128, -118.2437  // Same latitude, west
      );

      expect(bearing).toBeCloseTo(270, 5); // Due west
    });
  });

  describe('Edge Cases', () => {
    it('should handle equator crossing', () => {
      const distance = calculateDistance(1, 0, -1, 0);
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle prime meridian crossing', () => {
      const distance = calculateDistance(0, 1, 0, -1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should handle antipodal points', () => {
      // Points on opposite sides of earth
      const distance = calculateDistance(0, 0, 0, 180);
      expect(distance).toBeCloseTo(12437, 0); // Approximately half earth circumference
    });
  });

  describe('Performance', () => {
    it('should calculate distance quickly for many points', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        calculateDistance(
          40 + Math.random(),
          -74 + Math.random(),
          41 + Math.random(),
          -75 + Math.random()
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });
  });
});
