const AlertConfiguration = require('../models/AlertConfiguration');
const { getSocketIO } = require('../config/socket');
const { logger } = require('../config/logger');
const { getConnection, sql } = require('../config/database');

class AlertService {
  constructor() {
    this.activeAlerts = new Map(); // Track active alerts per user
  }

  async checkBoundaryAlerts(authority, currentMP, currentLat, currentLon) {
    try {
      const { Authority_ID, Begin_MP, End_MP, User_ID } = authority;
      
      // Get distance to boundaries
      const distanceToStart = Math.abs(currentMP - Begin_MP);
      const distanceToEnd = Math.abs(currentMP - End_MP);
      const closestDistance = Math.min(distanceToStart, distanceToEnd);
      const closestBoundary = distanceToStart < distanceToEnd ? 'Begin' : 'End';
      
      // Get user's agency
      const pool = getConnection();
      const agencyQuery = `
        SELECT a.Agency_ID
        FROM Authorities auth
        INNER JOIN Subdivisions s ON auth.Subdivision_ID = s.Subdivision_ID
        INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
        WHERE auth.Authority_ID = @authorityId
      `;
      
      const agencyResult = await pool.request()
        .input('authorityId', sql.Int, Authority_ID)
        .query(agencyQuery);
      
      if (agencyResult.recordset.length === 0) {
        return;
      }
      
      const agencyId = agencyResult.recordset[0].Agency_ID;
      
      // Get appropriate alert configuration
      const alertConfig = await AlertConfiguration.getAlertForDistance(
        agencyId,
        'Boundary_Alert',
        closestDistance
      );
      
      if (!alertConfig) {
        return;
      }
      
      // Check if we already sent this alert recently
      const alertKey = `boundary-${Authority_ID}-${closestBoundary}-${alertConfig.Alert_Level}`;
      const lastAlertTime = this.activeAlerts.get(alertKey);
      
      if (lastAlertTime && (Date.now() - lastAlertTime) < 60000) {
        // Don't send same alert within 1 minute
        return;
      }
      
      // Send alert
      await this.sendAlert({
        userId: User_ID,
        authorityId: Authority_ID,
        alertType: 'Boundary_Approach',
        alertLevel: alertConfig.Alert_Level,
        triggeredDistance: closestDistance,
        message: this.formatAlertMessage(alertConfig.Message_Template, {
          distance: closestDistance.toFixed(2),
          boundary: closestBoundary === 'Begin' ? 'start' : 'end',
          milepost: closestBoundary === 'Begin' ? Begin_MP : End_MP
        }),
        data: {
          authorityId: Authority_ID,
          boundaryType: closestBoundary,
          distanceToBoundary: closestDistance,
          currentMP,
          currentLat,
          currentLon
        }
      });
      
      // Store alert time
      this.activeAlerts.set(alertKey, Date.now());
      
    } catch (error) {
      logger.error('Check boundary alerts error:', error);
    }
  }

  async checkProximityAlerts(authority, proximityData) {
    try {
      const { Authority_ID, User_ID } = authority;
      
      // Get user's agency
      const pool = getConnection();
      const agencyQuery = `
        SELECT a.Agency_ID
        FROM Authorities auth
        INNER JOIN Subdivisions s ON auth.Subdivision_ID = s.Subdivision_ID
        INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
        WHERE auth.Authority_ID = @authorityId
      `;
      
      const agencyResult = await pool.request()
        .input('authorityId', sql.Int, Authority_ID)
        .query(agencyQuery);
      
      if (agencyResult.recordset.length === 0) {
        return;
      }
      
      const agencyId = agencyResult.recordset[0].Agency_ID;
      
      for (const otherWorker of proximityData) {
        const distance = otherWorker.DistanceMiles;
        
        // Get appropriate alert configuration
        const alertConfig = await AlertConfiguration.getAlertForDistance(
          agencyId,
          'Proximity_Alert',
          distance
        );
        
        if (!alertConfig) {
          continue;
        }
        
        // Check if we already sent this alert recently
        const alertKey = `proximity-${Authority_ID}-${otherWorker.User_ID}-${alertConfig.Alert_Level}`;
        const lastAlertTime = this.activeAlerts.get(alertKey);
        
        if (lastAlertTime && (Date.now() - lastAlertTime) < 30000) {
          // Don't send same proximity alert within 30 seconds
          continue;
        }
        
        // Send alert to both users
        const alertMessage = this.formatAlertMessage(alertConfig.Message_Template, {
          distance: distance.toFixed(2),
          employee_name: otherWorker.Employee_Name_Display || otherWorker.Employee_Name,
          employee_contact: otherWorker.Employee_Contact_Display || otherWorker.Employee_Contact
        });
        
        // Alert to current user
        await this.sendAlert({
          userId: User_ID,
          authorityId: Authority_ID,
          alertType: 'Proximity',
          alertLevel: alertConfig.Alert_Level,
          triggeredDistance: distance,
          message: alertMessage,
          data: {
            otherWorker: {
              userId: otherWorker.User_ID,
              employeeName: otherWorker.Employee_Name_Display || otherWorker.Employee_Name,
              employeeContact: otherWorker.Employee_Contact_Display || otherWorker.Employee_Contact,
              distance
            }
          }
        });
        
        // Alert to other worker (if they have an active authority)
        await this.sendAlert({
          userId: otherWorker.User_ID,
          authorityId: otherWorker.Authority_ID,
          alertType: 'Proximity',
          alertLevel: alertConfig.Alert_Level,
          triggeredDistance: distance,
          message: alertMessage,
          data: {
            otherWorker: {
              userId: User_ID,
              employeeName: authority.Employee_Name_Display || authority.Employee_Name,
              employeeContact: authority.Employee_Contact_Display || authority.Employee_Contact,
              distance
            }
          }
        });
        
        // Store alert time
        this.activeAlerts.set(alertKey, Date.now());
      }
      
    } catch (error) {
      logger.error('Check proximity alerts error:', error);
    }
  }

  async sendOverlapAlert(overlapDetails) {
    try {
      const { authority1, authority2, overlapType } = overlapDetails;
      
      // Get agency for alert configuration
      const pool = getConnection();
      const agencyQuery = `
        SELECT a.Agency_ID
        FROM Authorities auth
        INNER JOIN Subdivisions s ON auth.Subdivision_ID = s.Subdivision_ID
        INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
        WHERE auth.Authority_ID = @authorityId
      `;
      
      const agencyResult = await pool.request()
        .input('authorityId', sql.Int, authority1.Authority_ID)
        .query(agencyQuery);
      
      if (agencyResult.recordset.length === 0) {
        return;
      }
      
      const agencyId = agencyResult.recordset[0].Agency_ID;
      
      // Get overlap alert configuration
      const alertConfigs = await AlertConfiguration.getAgencyConfigurations(agencyId);
      const overlapConfig = alertConfigs.Overlap_Alert?.[0];
      
      if (!overlapConfig) {
        return;
      }
      
      // Send alert to first user
      await this.sendAlert({
        userId: authority1.User_ID,
        authorityId: authority1.Authority_ID,
        alertType: 'Overlap_Detected',
        alertLevel: overlapConfig.Alert_Level,
        triggeredDistance: 0,
        message: this.formatAlertMessage(overlapConfig.Message_Template, {
          employee_name: authority2.Employee_Name_Display || authority2.Employee_Name,
          employee_contact: authority2.Employee_Contact_Display || authority2.Employee_Contact,
          overlap_type: overlapType
        }),
        data: {
          overlappingAuthority: {
            authorityId: authority2.Authority_ID,
            employeeName: authority2.Employee_Name_Display || authority2.Employee_Name,
            employeeContact: authority2.Employee_Contact_Display || authority2.Employee_Contact,
            beginMP: authority2.Begin_MP,
            endMP: authority2.End_MP,
            overlapType
          }
        }
      });
      
      // Send alert to second user
      await this.sendAlert({
        userId: authority2.User_ID,
        authorityId: authority2.Authority_ID,
        alertType: 'Overlap_Detected',
        alertLevel: overlapConfig.Alert_Level,
        triggeredDistance: 0,
        message: this.formatAlertMessage(overlapConfig.Message_Template, {
          employee_name: authority1.Employee_Name_Display || authority1.Employee_Name,
          employee_contact: authority1.Employee_Contact_Display || authority1.Employee_Contact,
          overlap_type: overlapType
        }),
        data: {
          overlappingAuthority: {
            authorityId: authority1.Authority_ID,
            employeeName: authority1.Employee_Name_Display || authority1.Employee_Name,
            employeeContact: authority1.Employee_Contact_Display || authority1.Employee_Contact,
            beginMP: authority1.Begin_MP,
            endMP: authority1.End_MP,
            overlapType
          }
        }
      });
      
    } catch (error) {
      logger.error('Send overlap alert error:', error);
    }
  }

  async sendAlert(alertData) {
    const {
      userId,
      authorityId,
      alertType,
      alertLevel,
      triggeredDistance,
      message,
      data = {}
    } = alertData;

    const pool = getConnection();
    const socket = getSocketIO();

    try {
      // Log alert in database
      const query = `
        INSERT INTO Alert_Logs (
          User_ID, Authority_ID, Alert_Type, Alert_Level,
          Triggered_Distance, Message, Is_Delivered, Delivered_Time
        )
        OUTPUT INSERTED.*
        VALUES (
          @userId, @authorityId, @alertType, @alertLevel,
          @triggeredDistance, @message, 1, GETDATE()
        )
      `;

      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('authorityId', sql.Int, authorityId)
        .input('alertType', sql.NVarChar, alertType)
        .input('alertLevel', sql.NVarChar, alertLevel)
        .input('triggeredDistance', sql.Decimal(5,2), triggeredDistance)
        .input('message', sql.NVarChar, message)
        .query(query);

      const alertLog = result.recordset[0];

      // Send real-time alert via Socket.IO
      const socketData = {
        alertId: alertLog.Alert_Log_ID,
        type: alertType,
        level: alertLevel,
        message,
        timestamp: new Date(),
        data
      };

      socket.to(`user-${userId}`).emit('alert', socketData);

      logger.info(`Alert sent to user ${userId}: ${alertType} (${alertLevel})`);

      return alertLog;

    } catch (error) {
      logger.error('Send alert error:', error);
      
      // Try to log failed alert
      try {
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('authorityId', sql.Int, authorityId)
          .input('alertType', sql.NVarChar, alertType)
          .input('alertLevel', sql.NVarChar, alertLevel)
          .input('triggeredDistance', sql.Decimal(5,2), triggeredDistance)
          .input('message', sql.NVarChar, message)
          .query(`
            INSERT INTO Alert_Logs (User_ID, Authority_ID, Alert_Type, Alert_Level, Triggered_Distance, Message)
            VALUES (@userId, @authorityId, @alertType, @alertLevel, @triggeredDistance, @message)
          `);
      } catch (logError) {
        logger.error('Failed to log failed alert:', logError);
      }
      
      throw error;
    }
  }

  formatAlertMessage(template, variables) {
    if (!template) {
      return 'Alert triggered';
    }

    let message = template;
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return message;
  }

  async cleanupOldAlerts() {
    try {
      const pool = getConnection();
      
      // Remove alerts older than 1 hour from active alerts map
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const [key, timestamp] of this.activeAlerts.entries()) {
        if (timestamp < oneHourAgo) {
          this.activeAlerts.delete(key);
        }
      }
      
      // Clean up delivered alerts older than 30 days
      await pool.request().query(`
        DELETE FROM Alert_Logs 
        WHERE Is_Delivered = 1 
          AND Created_Date < DATEADD(day, -30, GETDATE())
      `);
      
      logger.debug('Cleaned up old alerts');
      
    } catch (error) {
      logger.error('Cleanup old alerts error:', error);
    }
  }
}

// Create singleton instance
const alertService = new AlertService();

// Schedule cleanup every hour
setInterval(() => {
  alertService.cleanupOldAlerts();
}, 60 * 60 * 1000);

module.exports = alertService;