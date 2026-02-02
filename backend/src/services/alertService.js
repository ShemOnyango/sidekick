// backend/src/services/alertService.js
const db = require('../config/database');
const { logger } = require('../config/logger');
const socket = require('../config/socket');

class AlertService {
  constructor() {
    this.activeConnections = new Map();
  }

  /**
   * Check for authority overlaps when a new authority is created
   */
  async checkAuthorityOverlap(authorityData) {
    try {
      const {
        Subdivision_ID,
        Track_Type,
        Track_Number,
        Begin_MP,
        End_MP,
        Authority_ID
      } = authorityData;

      const query = `
        SELECT 
          a.Authority_ID,
          a.User_ID,
          a.Begin_MP,
          a.End_MP,
          u.Employee_Name_Display,
          u.Employee_Contact_Display,
          s.Subdivision_Code,
          ag.Agency_Name
        FROM Authorities a
        JOIN Users u ON a.User_ID = u.User_ID
        JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
        JOIN Agencies ag ON s.Agency_ID = ag.Agency_ID
        WHERE a.Subdivision_ID = @Subdivision_ID
          AND a.Track_Type = @Track_Type
          AND a.Track_Number = @Track_Number
          AND a.Is_Active = 1
          AND a.Authority_ID != @Authority_ID
          AND (
            (a.Begin_MP BETWEEN @Begin_MP AND @End_MP) OR
            (a.End_MP BETWEEN @Begin_MP AND @End_MP) OR
            (@Begin_MP BETWEEN a.Begin_MP AND a.End_MP) OR
            (@End_MP BETWEEN a.Begin_MP AND a.End_MP)
          )
      `;

      const request = new db.Request();
      request.input('Subdivision_ID', db.Int, Subdivision_ID);
      request.input('Track_Type', db.VarChar, Track_Type);
      request.input('Track_Number', db.VarChar, Track_Number);
      request.input('Begin_MP', db.Decimal(10,4), Begin_MP);
      request.input('End_MP', db.Decimal(10,4), End_MP);
      request.input('Authority_ID', db.Int, Authority_ID);

      const result = await request.query(query);
      
      if (result.recordset.length > 0) {
        logger.info(`Authority overlap detected for Authority_ID ${Authority_ID}`);
        return {
          hasOverlap: true,
          overlaps: result.recordset
        };
      }

      return {
        hasOverlap: false,
        overlaps: []
      };
    } catch (error) {
      logger.error('Error checking authority overlap:', error);
      throw error;
    }
  }

  /**
   * Send real-time overlap alerts via Socket.IO
   */
  async sendOverlapAlerts(newAuthority, overlappingAuthorities) {
    try {
      const io = socket.getIO();
      
      // Alert each overlapping authority user
      overlappingAuthorities.forEach(overlap => {
        // Alert the user whose authority is being overlapped
        io.to(`user-${overlap.User_ID}`).emit('authority_overlap', {
          type: 'AUTHORITY_OVERLAP',
          title: 'Authority Conflict Detected',
          message: `Your authority overlaps with ${newAuthority.Employee_Name_Display}`,
          level: 'critical',
          data: {
            overlappingAuthority: {
              employeeName: newAuthority.Employee_Name_Display,
              employeeContact: newAuthority.Employee_Contact_Display,
              beginMP: newAuthority.Begin_MP,
              endMP: newAuthority.End_MP,
              trackType: newAuthority.Track_Type,
              trackNumber: newAuthority.Track_Number
            },
            yourAuthority: {
              beginMP: overlap.Begin_MP,
              endMP: overlap.End_MP
            }
          },
          timestamp: new Date().toISOString()
        });

        // Also alert the new authority user
        io.to(`user-${newAuthority.User_ID}`).emit('authority_overlap', {
          type: 'AUTHORITY_OVERLAP',
          title: 'Authority Conflict Detected',
          message: `Your authority overlaps with ${overlap.Employee_Name_Display}`,
          level: 'critical',
          data: {
            overlappingAuthority: {
              employeeName: overlap.Employee_Name_Display,
              employeeContact: overlap.Employee_Contact_Display,
              beginMP: overlap.Begin_MP,
              endMP: overlap.End_MP,
              trackType: overlap.Track_Type,
              trackNumber: overlap.Track_Number
            },
            yourAuthority: {
              beginMP: newAuthority.Begin_MP,
              endMP: newAuthority.End_MP
            }
          },
          timestamp: new Date().toISOString()
        });
      });

      // Log all overlaps
      await this.logAuthorityOverlaps(newAuthority.Authority_ID, overlappingAuthorities);
      
      logger.info(`Sent overlap alerts for Authority_ID ${newAuthority.Authority_ID}`);
    } catch (error) {
      logger.error('Error sending overlap alerts:', error);
      throw error;
    }
  }

  /**
   * Check proximity between users (0.25, 0.5, 0.75, 1.0 mile alerts)
   */
  async checkUserProximity(userData) {
    try {
      const {
        Authority_ID,
        Latitude,
        Longitude,
        Subdivision_ID
      } = userData;

      // Get all other active users in the same subdivision
      const query = `
        SELECT 
          a.Authority_ID,
          a.User_ID,
          u.Employee_Name_Display,
          u.Employee_Contact_Display,
          gl.Latitude,
          gl.Longitude,
          gl.Created_Date as LastUpdate
        FROM Authorities a
        JOIN Users u ON a.User_ID = u.User_ID
        LEFT JOIN GPS_Logs gl ON a.Authority_ID = gl.Authority_ID
          AND gl.Created_Date = (
            SELECT MAX(Created_Date) 
            FROM GPS_Logs 
            WHERE Authority_ID = a.Authority_ID
          )
        WHERE a.Subdivision_ID = @Subdivision_ID
          AND a.Is_Active = 1
          AND a.Authority_ID != @Authority_ID
          AND gl.Latitude IS NOT NULL
          AND gl.Longitude IS NOT NULL
      `;

      const request = new db.Request();
      request.input('Subdivision_ID', db.Int, Subdivision_ID);
      request.input('Authority_ID', db.Int, Authority_ID);

      const result = await request.query(query);
      
      // Get agency's alert configurations
      const alertConfigs = await this.getAlertConfigurations(userData.Agency_ID);
      
      const proximityAlerts = [];
      
      result.recordset.forEach(otherUser => {
        const distance = this.calculateTrackDistance(
          Latitude, Longitude,
          otherUser.Latitude, otherUser.Longitude,
          Subdivision_ID
        );

        // Check each alert distance threshold
        alertConfigs.forEach(config => {
          if (distance <= config.Distance_Miles) {
            proximityAlerts.push({
              user: otherUser,
              distance: distance,
              alertLevel: config.Alert_Level,
              alertDistance: config.Distance_Miles
            });
          }
        });
      });

      return proximityAlerts;
    } catch (error) {
      logger.error('Error checking user proximity:', error);
      throw error;
    }
  }

  /**
   * Send proximity alerts via Socket.IO
   */
  async sendProximityAlerts(userId, proximityAlerts) {
    try {
      const io = socket.getIO();
      
      proximityAlerts.forEach(alert => {
        io.to(`user-${userId}`).emit('proximity_alert', {
          type: 'PROXIMITY_ALERT',
          title: `${alert.alertLevel.toUpperCase()} Proximity Alert`,
          message: `You are within ${alert.alertDistance} miles of ${alert.user.Employee_Name_Display}`,
          level: alert.alertLevel.toLowerCase(),
          data: {
            otherUser: {
              employeeName: alert.user.Employee_Name_Display,
              employeeContact: alert.user.Employee_Contact_Display
            },
            distance: alert.distance.toFixed(2),
            alertThreshold: alert.alertDistance
          },
          timestamp: new Date().toISOString()
        });
      });

      if (proximityAlerts.length > 0) {
        logger.info(`Sent ${proximityAlerts.length} proximity alerts to User_ID ${userId}`);
      }
    } catch (error) {
      logger.error('Error sending proximity alerts:', error);
      throw error;
    }
  }

  /**
   * Check boundary alerts (approaching authority limits)
   */
  async checkBoundaryAlerts(authorityData, currentMilepost) {
    try {
      const { Authority_ID, Begin_MP, End_MP, Agency_ID } = authorityData;
      
      // Calculate distances to boundaries
      const distanceToBegin = Math.abs(currentMilepost - Begin_MP);
      const distanceToEnd = Math.abs(currentMilepost - End_MP);
      const minDistance = Math.min(distanceToBegin, distanceToEnd);
      
      // Get boundary alert configurations
      const boundaryConfigs = await this.getAlertConfigurations(
        Agency_ID, 
        'Boundary_Alert'
      );
      
      const boundaryAlerts = [];
      
      boundaryConfigs.forEach(config => {
        if (minDistance <= config.Distance_Miles) {
          const boundary = distanceToBegin < distanceToEnd ? 'begin' : 'end';
          boundaryAlerts.push({
            authorityId: Authority_ID,
            boundary: boundary,
            distance: minDistance,
            alertLevel: config.Alert_Level,
            alertDistance: config.Distance_Miles
          });
        }
      });

      return boundaryAlerts;
    } catch (error) {
      logger.error('Error checking boundary alerts:', error);
      throw error;
    }
  }

  /**
   * Send boundary alerts via Socket.IO
   */
  async sendBoundaryAlerts(userId, authorityId, boundaryAlerts) {
    try {
      const io = socket.getIO();
      
      boundaryAlerts.forEach(alert => {
        io.to(`user-${userId}`).emit('boundary_alert', {
          type: 'BOUNDARY_ALERT',
          title: `${alert.alertLevel.toUpperCase()} Boundary Alert`,
          message: `You are within ${alert.alertDistance} miles of the ${alert.boundary} boundary`,
          level: alert.alertLevel.toLowerCase(),
          data: {
            authorityId: authorityId,
            boundary: alert.boundary,
            distance: alert.distance,
            alertThreshold: alert.alertDistance
          },
          timestamp: new Date().toISOString()
        });
      });

      if (boundaryAlerts.length > 0) {
        logger.info(`Sent ${boundaryAlerts.length} boundary alerts for Authority_ID ${authorityId}`);
      }
    } catch (error) {
      logger.error('Error sending boundary alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert configurations for an agency
   */
  async getAlertConfigurations(agencyId, configType = null) {
    try {
      let query = `
        SELECT * FROM Alert_Configurations 
        WHERE Agency_ID = @Agency_ID 
          AND Is_Active = 1
      `;
      
      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      
      if (configType) {
        query += ' AND Config_Type = @Config_Type';
        request.input('Config_Type', db.VarChar, configType);
      }
      
      query += ' ORDER BY Distance_Miles ASC';
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Error getting alert configurations:', error);
      return [];
    }
  }

  /**
   * Calculate track-based distance (not straight-line GPS)
   * This uses milepost geometry for accurate track distance
   */
  async calculateTrackDistance(lat1, lon1, lat2, lon2, subdivisionId) {
    try {
      // First, get the nearest mileposts for both points
      const point1MP = await this.findNearestMilepost(lat1, lon1, subdivisionId);
      const point2MP = await this.findNearestMilepost(lat2, lon2, subdivisionId);
      
      if (!point1MP || !point2MP) {
        // Fallback to straight-line distance if milepost data not available
        return this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
      }
      
      // Calculate distance along track using mileposts
      return Math.abs(point2MP - point1MP);
    } catch (error) {
      logger.error('Error calculating track distance:', error);
      return this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
    }
  }

  /**
   * Find nearest milepost for coordinates
   */
  async findNearestMilepost(latitude, longitude, subdivisionId) {
    try {
      const query = `
        SELECT TOP 1 MP 
        FROM Milepost_Geometry 
        WHERE Subdivision_ID = @Subdivision_ID
        ORDER BY (
          (Latitude - @Latitude) * (Latitude - @Latitude) +
          (Longitude - @Longitude) * (Longitude - @Longitude)
        )
      `;
      
      const request = new db.Request();
      request.input('Subdivision_ID', db.Int, subdivisionId);
      request.input('Latitude', db.Decimal(10,8), latitude);
      request.input('Longitude', db.Decimal(11,8), longitude);
      
      const result = await request.query(query);
      
      return result.recordset.length > 0 ? result.recordset[0].MP : null;
    } catch (error) {
      logger.error('Error finding nearest milepost:', error);
      return null;
    }
  }

  /**
   * Haversine formula for straight-line distance (fallback)
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * Log authority overlaps for audit trail
   */
  async logAuthorityOverlaps(authorityId, overlappingAuthorities) {
    try {
      for (const overlap of overlappingAuthorities) {
        const query = `
          INSERT INTO Authority_Overlaps 
          (Authority1_ID, Authority2_ID, Overlap_Detected_Time, Alert_Sent_Time)
          VALUES (@Authority1_ID, @Authority2_ID, GETDATE(), GETDATE())
        `;
        
        const request = new db.Request();
        request.input('Authority1_ID', db.Int, authorityId);
        request.input('Authority2_ID', db.Int, overlap.Authority_ID);
        
        await request.query(query);
      }
    } catch (error) {
      logger.error('Error logging authority overlaps:', error);
    }
  }

  /**
   * Handle user connection/disconnection for real-time alerts
   */
  handleUserConnection(userId, socketId) {
    this.activeConnections.set(userId, socketId);
    logger.info(`User ${userId} connected with socket ${socketId}`);
  }

  handleUserDisconnection(userId) {
    this.activeConnections.delete(userId);
    logger.info(`User ${userId} disconnected`);
  }

  /**
   * Get user's socket connection
   */
  getUserSocket(userId) {
    return this.activeConnections.get(userId);
  }

  /**
   * Check if user is connected for real-time alerts
   */
  isUserConnected(userId) {
    return this.activeConnections.has(userId);
  }
}

module.exports = new AlertService();