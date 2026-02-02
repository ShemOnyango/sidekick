const Authority = require('../models/Authority');
const AlertService = require('./alertService');
const { logger } = require('../config/logger');
const { getConnection, sql } = require('../config/database');
const {
  calculateMilepostFromGeometry,
  calculateTrackDistance
} = require('../utils/geoCalculations');

class GPSService {
  constructor() {
    this.userPositions = new Map(); // Track last known positions
    this.updateInterval = 30000; // 30 seconds for boundary checks
  }

  async processGPSUpdate(gpsData) {
    const { userId, authorityId, latitude, longitude } = gpsData;

    try {
      // Store last position
      this.userPositions.set(userId, {
        latitude,
        longitude,
        timestamp: Date.now(),
        authorityId
      });

      // Log GPS data
      await this.logGPSPosition(gpsData);

      // Get authority details
      const authority = await Authority.getAuthorityById(authorityId);
      
      if (!authority || !authority.Is_Active) {
        return { logged: true, authority: null };
      }

      // Calculate milepost using geometry
      const milepostData = await this.calculateMilepost(
        authority.Subdivision_ID,
        latitude,
        longitude
      );

      if (milepostData && milepostData.milepost !== null) {
        const currentMP = milepostData.milepost;

        // Check boundary alerts using track-based distance
        const boundaryDistances = await this.calculateDistanceToAuthorityBoundary(
          authority.Subdivision_ID,
          currentMP,
          authority.Begin_MP,
          authority.End_MP
        );

        await AlertService.checkBoundaryAlerts(
          authority,
          currentMP,
          latitude,
          longitude,
          boundaryDistances
        );

        // Check proximity to other workers
        const proximityData = await Authority.checkProximity(
          authorityId,
          latitude,
          longitude,
          1.0 // 1 mile max distance for proximity check
        );

        if (proximityData && proximityData.length > 0) {
          await AlertService.checkProximityAlerts(authority, proximityData);
        }

        logger.debug(`GPS processed for user ${userId}, authority ${authorityId}, MP: ${currentMP}`);

        return {
          logged: true,
          milepost: milepostData,
          boundaryDistances
        };
      }

      return { logged: true, milepost: null };

    } catch (error) {
      logger.error('Process GPS update error:', error);
      return { logged: false, error: error.message };
    }
  }

  async logGPSPosition(gpsData) {
    const pool = getConnection();
    
    try {
      const query = `
        INSERT INTO GPS_Logs (
          User_ID, Authority_ID, Latitude, Longitude,
          Speed, Heading, Accuracy, Is_Offline, Sync_Status
        )
        OUTPUT INSERTED.*
        VALUES (
          @userId, @authorityId, @latitude, @longitude,
          @speed, @heading, @accuracy, @isOffline, 'Synced'
        )
      `;

      const result = await pool.request()
        .input('userId', sql.Int, gpsData.userId)
        .input('authorityId', sql.Int, gpsData.authorityId)
        .input('latitude', sql.Decimal(10,8), gpsData.latitude)
        .input('longitude', sql.Decimal(11,8), gpsData.longitude)
        .input('speed', sql.Decimal(5,2), gpsData.speed)
        .input('heading', sql.Decimal(5,2), gpsData.heading)
        .input('accuracy', sql.Decimal(5,2), gpsData.accuracy)
        .input('isOffline', sql.Bit, gpsData.isOffline ? 1 : 0)
        .query(query);

      return result.recordset[0];

    } catch (error) {
      logger.error('Log GPS position error:', error);
      
      // Try to log in sync queue for offline retry
      if (gpsData.isOffline) {
        await this.queueForSync(gpsData);
      }
      
      throw error;
    }
  }

  async calculateMilepost(subdivisionId, latitude, longitude) {
    try {
      const pool = getConnection();
      
      // Get all milepost geometry for this subdivision
      const query = `
        SELECT MP, Latitude, Longitude, Track_Type, Track_Number
        FROM Milepost_Geometry
        WHERE Subdivision_ID = @subdivisionId
          AND Is_Active = 1
        ORDER BY MP
      `;
      
      const result = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(query);
      
      if (result.recordset.length === 0) {
        logger.warn(`No milepost geometry found for subdivision ${subdivisionId}`);
        return null;
      }

      // Use advanced geometry calculation
      const milepostData = calculateMilepostFromGeometry(
        latitude,
        longitude,
        result.recordset
      );

      if (!milepostData) {
        return null;
      }

      // Log if user is far from track
      if (milepostData.distanceFromTrack > 0.1) {
        logger.warn(`User position is ${milepostData.distanceFromTrack.toFixed(2)} miles from track`);
      }

      return {
        milepost: milepostData.milepost,
        confidence: milepostData.confidence,
        distanceFromTrack: milepostData.distanceFromTrack,
        trackType: milepostData.nearestGeometry?.Track_Type,
        trackNumber: milepostData.nearestGeometry?.Track_Number
      };
      
    } catch (error) {
      logger.error('Calculate milepost error:', error);
      return null;
    }
  }

  /**
   * Calculate track-based distance between two points
   */
  async calculateTrackDistanceBetween(subdivisionId, mp1, mp2) {
    try {
      const pool = getConnection();
      
      // Get milepost geometry
      const query = `
        SELECT MP, Latitude, Longitude
        FROM Milepost_Geometry
        WHERE Subdivision_ID = @subdivisionId
          AND Is_Active = 1
          AND MP BETWEEN @minMP AND @maxMP
        ORDER BY MP
      `;
      
      const minMP = Math.min(mp1, mp2);
      const maxMP = Math.max(mp1, mp2);
      
      const result = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .input('minMP', sql.Decimal(10, 4), minMP)
        .input('maxMP', sql.Decimal(10, 4), maxMP)
        .query(query);
      
      if (result.recordset.length === 0) {
        // Fall back to simple milepost difference
        return Math.abs(mp2 - mp1);
      }

      // Calculate actual track distance
      const trackDistance = calculateTrackDistance(mp1, mp2, result.recordset);
      
      return trackDistance;
      
    } catch (error) {
      logger.error('Calculate track distance error:', error);
      // Fall back to simple difference
      return Math.abs(mp2 - mp1);
    }
  }

  /**
   * Calculate distance to authority boundary using track geometry
   */
  async calculateDistanceToAuthorityBoundary(authority, currentMP) {
    try {
      const beginDistance = await this.calculateTrackDistanceBetween(
        authority.Subdivision_ID,
        currentMP,
        authority.Begin_MP
      );

      const endDistance = await this.calculateTrackDistanceBetween(
        authority.Subdivision_ID,
        currentMP,
        authority.End_MP
      );

      return {
        distanceToBegin: beginDistance,
        distanceToEnd: endDistance,
        nearestBoundary: Math.min(beginDistance, endDistance),
        isApproachingBegin: currentMP < authority.Begin_MP,
        isApproachingEnd: currentMP > authority.End_MP
      };
      
    } catch (error) {
      logger.error('Calculate boundary distance error:', error);
      return null;
    }
  }

  async queueForSync(gpsData) {
    const pool = getConnection();
    
    try {
      // Get device ID for user
      const deviceQuery = `
        SELECT TOP 1 Device_ID 
        FROM Mobile_Devices 
        WHERE User_ID = @userId AND Is_Active = 1
      `;
      
      const deviceResult = await pool.request()
        .input('userId', sql.Int, gpsData.userId)
        .query(deviceQuery);
      
      if (deviceResult.recordset.length === 0) {
        return;
      }
      
      const deviceId = deviceResult.recordset[0].Device_ID;
      
      // Queue for sync
      await pool.request()
        .input('deviceId', sql.Int, deviceId)
        .input('tableName', sql.NVarChar, 'GPS_Logs')
        .input('recordId', sql.Int, 0) // Will be set on sync
        .input('operation', sql.NVarChar, 'INSERT')
        .input('syncData', sql.NVarChar, JSON.stringify(gpsData))
        .query(`
          INSERT INTO Data_Sync_Queue (Device_ID, Table_Name, Record_ID, Operation, Sync_Data)
          VALUES (@deviceId, @tableName, @recordId, @operation, @syncData)
        `);
      
      logger.debug(`GPS data queued for sync for user ${gpsData.userId}`);
      
    } catch (error) {
      logger.error('Queue for sync error:', error);
    }
  }

  async getUserPosition(userId) {
    return this.userPositions.get(userId);
  }

  async getAllActivePositions() {
    const positions = [];
    
    for (const [userId, position] of this.userPositions.entries()) {
      // Only include positions from last 5 minutes
      if (Date.now() - position.timestamp < 5 * 60 * 1000) {
        positions.push({
          userId,
          ...position
        });
      }
    }
    
    return positions;
  }

  async cleanupOldPositions() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [userId, position] of this.userPositions.entries()) {
      if (position.timestamp < fiveMinutesAgo) {
        this.userPositions.delete(userId);
      }
    }
  }
}

// Create singleton instance
const gpsService = new GPSService();

// Schedule cleanup every minute
setInterval(() => {
  gpsService.cleanupOldPositions();
}, 60 * 1000);

module.exports = gpsService;