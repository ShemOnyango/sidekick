// backend/src/services/analyticsService.js
const db = require('../config/database');
const { logger } = require('../config/logger');
const moment = require('moment');

class AnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getDashboardStats(agencyId, startDate = null, endDate = null) {
    const cacheKey = `dashboard_${agencyId}_${startDate}_${endDate}`;
    
    if (this.analyticsCache.has(cacheKey)) {
      const cached = this.analyticsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const [
        userStats,
        authorityStats,
        alertStats,
        systemStats,
        recentActivity,
      ] = await Promise.all([
        this.getUserStats(agencyId, startDate, endDate),
        this.getAuthorityStats(agencyId, startDate, endDate),
        this.getAlertStats(agencyId, startDate, endDate),
        this.getSystemStats(agencyId),
        this.getRecentActivity(agencyId, 10),
      ]);

      const stats = {
        userStats,
        authorityStats,
        alertStats,
        systemStats,
        recentActivity,
        timestamp: new Date().toISOString(),
      };

      this.analyticsCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now(),
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  async getUserStats(agencyId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN u.Is_Active = 1 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN u.Role = 'Field_Worker' THEN 1 ELSE 0 END) as field_workers,
          SUM(CASE WHEN u.Role = 'Supervisor' THEN 1 ELSE 0 END) as supervisors,
          SUM(CASE WHEN u.Role = 'Administrator' THEN 1 ELSE 0 END) as administrators,
          AVG(DATEDIFF(DAY, u.Created_Date, GETDATE())) as avg_account_age_days
        FROM Users u
        INNER JOIN Subdivisions s ON u.Agency_ID = s.Agency_ID
        WHERE u.Agency_ID = @Agency_ID
          ${startDate ? 'AND u.Created_Date >= @StartDate' : ''}
          ${endDate ? 'AND u.Created_Date <= @EndDate' : ''}
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      if (startDate) {
        request.input('StartDate', db.DateTime, startDate);
      }
      if (endDate) {
        request.input('EndDate', db.DateTime, endDate);
      }

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      return {};
    }
  }

  async getAuthorityStats(agencyId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_authorities,
          SUM(CASE WHEN a.Is_Active = 1 THEN 1 ELSE 0 END) as active_authorities,
          SUM(CASE WHEN a.Authority_Type = 'Track_Authority' THEN 1 ELSE 0 END) as track_authorities,
          SUM(CASE WHEN a.Authority_Type = 'Lone_Worker_Authority' THEN 1 ELSE 0 END) as lone_worker_authorities,
          AVG(DATEDIFF(MINUTE, a.Start_Time, ISNULL(a.Expiration_Time, GETDATE()))) as avg_duration_minutes,
          SUM(CASE WHEN DATEDIFF(HOUR, a.Created_Date, GETDATE()) <= 24 THEN 1 ELSE 0 END) as authorities_today
        FROM Authorities a
        INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
        WHERE s.Agency_ID = @Agency_ID
          ${startDate ? 'AND a.Created_Date >= @StartDate' : ''}
          ${endDate ? 'AND a.Created_Date <= @EndDate' : ''}
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      if (startDate) {
        request.input('StartDate', db.DateTime, startDate);
      }
      if (endDate) {
        request.input('EndDate', db.DateTime, endDate);
      }

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Failed to get authority stats:', error);
      return {};
    }
  }

  async getAlertStats(agencyId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_alerts,
          SUM(CASE WHEN al.Alert_Level = 'Critical' THEN 1 ELSE 0 END) as critical_alerts,
          SUM(CASE WHEN al.Alert_Level = 'Warning' THEN 1 ELSE 0 END) as warning_alerts,
          SUM(CASE WHEN al.Alert_Level = 'Informational' THEN 1 ELSE 0 END) as informational_alerts,
          SUM(CASE WHEN al.Alert_Type = 'BOUNDARY' THEN 1 ELSE 0 END) as boundary_alerts,
          SUM(CASE WHEN al.Alert_Type = 'PROXIMITY' THEN 1 ELSE 0 END) as proximity_alerts,
          SUM(CASE WHEN al.Alert_Type = 'OVERLAP' THEN 1 ELSE 0 END) as overlap_alerts,
          SUM(CASE WHEN DATEDIFF(HOUR, al.Created_Date, GETDATE()) <= 24 THEN 1 ELSE 0 END) as alerts_today
        FROM Alert_Logs al
        INNER JOIN Users u ON al.User_ID = u.User_ID
        WHERE u.Agency_ID = @Agency_ID
          ${startDate ? 'AND al.Created_Date >= @StartDate' : ''}
          ${endDate ? 'AND al.Created_Date <= @EndDate' : ''}
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      if (startDate) {
        request.input('StartDate', db.DateTime, startDate);
      }
      if (endDate) {
        request.input('EndDate', db.DateTime, endDate);
      }

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Failed to get alert stats:', error);
      return {};
    }
  }

  async getSystemStats(agencyId) {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM GPS_Logs gl 
           INNER JOIN Users u ON gl.User_ID = u.User_ID 
           WHERE u.Agency_ID = @Agency_ID 
             AND DATEDIFF(HOUR, gl.Created_Date, GETDATE()) <= 1) as gps_logs_last_hour,
          (SELECT COUNT(*) FROM Data_Sync_Queue WHERE Sync_Status = 'pending') as pending_syncs,
          (SELECT COUNT(*) FROM Mobile_Devices md
           INNER JOIN Users u ON md.User_ID = u.User_ID
           WHERE u.Agency_ID = @Agency_ID AND md.Is_Active = 1) as active_devices,
          'healthy' as database_status
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Failed to get system stats:', error);
      return {};
    }
  }

  async getRecentActivity(agencyId, limit = 10) {
    try {
      const query = `
        SELECT TOP ${limit}
          al.Action_Type,
          al.Table_Name,
          al.Record_ID,
          u.Employee_Name,
          al.Created_Date,
          al.IP_Address,
          al.Device_Info
        FROM System_Audit_Logs al
        INNER JOIN Users u ON al.User_ID = u.User_ID
        WHERE u.Agency_ID = @Agency_ID
        ORDER BY al.Created_Date DESC
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return [];
    }
  }

  async getTrendData(agencyId, metric, period = '7d') {
    try {
      let dateFormat, dateRange;
      
      switch (period) {
      case '24h':
        dateFormat = 'HH';
        dateRange = 24;
        break;
      case '7d':
        dateFormat = 'MM-dd';
        dateRange = 7;
        break;
      case '30d':
        dateFormat = 'MM-dd';
        dateRange = 30;
        break;
      case '90d':
        dateFormat = 'yyyy-MM';
        dateRange = 90;
        break;
      default:
        dateFormat = 'MM-dd';
        dateRange = 7;
      }

      const endDate = moment();
      const startDate = moment().subtract(dateRange, 'days');
      const dateList = this.generateDateList(startDate, endDate, dateFormat);

      let dataQuery;
      
      switch (metric) {
      case 'authorities':
        dataQuery = this.getAuthorityTrendQuery(dateFormat);
        break;
      case 'alerts':
        dataQuery = this.getAlertTrendQuery(dateFormat);
        break;
      case 'users':
        dataQuery = this.getUserTrendQuery(dateFormat);
        break;
      case 'gps':
        dataQuery = this.getGPSTrendQuery(dateFormat);
        break;
      default:
        dataQuery = this.getAuthorityTrendQuery(dateFormat);
      }

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      request.input('StartDate', db.DateTime, startDate.toDate());
      request.input('EndDate', db.DateTime, endDate.toDate());

      const result = await request.query(dataQuery);

      // Merge with date list to ensure all dates are present
      const trendData = this.mergeWithDateList(result.recordset, dateList);
      
      return trendData;
    } catch (error) {
      logger.error('Failed to get trend data:', error);
      return [];
    }
  }

  getAuthorityTrendQuery(dateFormat) {
    return `
      SELECT 
        FORMAT(a.Start_Time, '${dateFormat}') as date,
        COUNT(*) as count
      FROM Authorities a
      INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
      WHERE s.Agency_ID = @Agency_ID
        AND a.Start_Time >= @StartDate
        AND a.Start_Time <= @EndDate
      GROUP BY FORMAT(a.Start_Time, '${dateFormat}')
      ORDER BY date
    `;
  }

  getAlertTrendQuery(dateFormat) {
    return `
      SELECT 
        FORMAT(al.Created_Date, '${dateFormat}') as date,
        COUNT(*) as count
      FROM Alert_Logs al
      INNER JOIN Users u ON al.User_ID = u.User_ID
      WHERE u.Agency_ID = @Agency_ID
        AND al.Created_Date >= @StartDate
        AND al.Created_Date <= @EndDate
      GROUP BY FORMAT(al.Created_Date, '${dateFormat}')
      ORDER BY date
    `;
  }

  getUserTrendQuery(dateFormat) {
    return `
      SELECT 
        FORMAT(u.Created_Date, '${dateFormat}') as date,
        COUNT(*) as count
      FROM Users u
      WHERE u.Agency_ID = @Agency_ID
        AND u.Created_Date >= @StartDate
        AND u.Created_Date <= @EndDate
      GROUP BY FORMAT(u.Created_Date, '${dateFormat}')
      ORDER BY date
    `;
  }

  getGPSTrendQuery(dateFormat) {
    return `
      SELECT 
        FORMAT(gl.Created_Date, '${dateFormat}') as date,
        COUNT(*) as count
      FROM GPS_Logs gl
      INNER JOIN Users u ON gl.User_ID = u.User_ID
      WHERE u.Agency_ID = @Agency_ID
        AND gl.Created_Date >= @StartDate
        AND gl.Created_Date <= @EndDate
      GROUP BY FORMAT(gl.Created_Date, '${dateFormat}')
      ORDER BY date
    `;
  }

  generateDateList(startDate, endDate, format) {
    const dates = [];
    let current = moment(startDate);
    
    while (current <= endDate) {
      dates.push({
        date: current.format(format),
        count: 0,
      });
      current = current.add(1, 'days');
    }
    
    return dates;
  }

  mergeWithDateList(data, dateList) {
    const dataMap = new Map(data.map(item => [item.date, item.count]));
    return dateList.map(dateItem => ({
      date: dateItem.date,
      count: dataMap.get(dateItem.date) || 0,
    }));
  }

  async getSafetyMetrics(agencyId) {
    try {
      const query = `
        SELECT 
          -- Near Miss Detection
          (SELECT COUNT(*) 
           FROM Alert_Logs 
           WHERE Alert_Type = 'PROXIMITY' 
             AND Alert_Level = 'critical'
             AND Triggered_Distance <= 0.25
             AND DATEDIFF(HOUR, Created_Date, GETDATE()) <= 24) as critical_proximities_24h,
          
          -- Authority Conflicts
          (SELECT COUNT(*) 
           FROM Authority_Overlaps ao
           INNER JOIN Authorities a ON ao.Authority1_ID = a.Authority_ID
           INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
           WHERE s.Agency_ID = @Agency_ID
             AND DATEDIFF(HOUR, ao.Overlap_Detected_Time, GETDATE()) <= 24) as overlaps_24h,
          
          -- Boundary Violations
          (SELECT COUNT(*) 
           FROM Alert_Logs 
           WHERE Alert_Type = 'BOUNDARY'
             AND Alert_Level = 'critical'
             AND DATEDIFF(HOUR, Created_Date, GETDATE()) <= 24) as boundary_violations_24h,
          
          -- Response Times
          (SELECT AVG(DATEDIFF(SECOND, Created_Date, Read_Time))
           FROM Alert_Logs 
           WHERE Alert_Level = 'critical'
             AND Is_Read = 1
             AND DATEDIFF(HOUR, Created_Date, GETDATE()) <= 24) as avg_critical_response_seconds
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Failed to get safety metrics:', error);
      return {};
    }
  }

  async generateReport(agencyId, reportType, startDate, endDate, options = {}) {
    try {
      let reportData;
      
      switch (reportType) {
      case 'safety':
        reportData = await this.generateSafetyReport(agencyId, startDate, endDate, options);
        break;
      case 'operations':
        reportData = await this.generateOperationsReport(agencyId, startDate, endDate, options);
        break;
      case 'compliance':
        reportData = await this.generateComplianceReport(agencyId, startDate, endDate, options);
        break;
      case 'usage':
        reportData = await this.generateUsageReport(agencyId, startDate, endDate, options);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
      }

      // Log report generation
      await this.logReportGeneration(agencyId, reportType, options.userId);

      return reportData;
    } catch (error) {
      logger.error('Failed to generate report:', error);
      throw error;
    }
  }

  async generateSafetyReport(agencyId, startDate, endDate, _options) {
    if (_options) {
      // _options intentionally referenced to satisfy linting when not used
      void _options;
    }
    const [
      alertStats,
      safetyMetrics,
      trendData,
      recentIncidents,
    ] = await Promise.all([
      this.getAlertStats(agencyId, startDate, endDate),
      this.getSafetyMetrics(agencyId, startDate, endDate),
      this.getTrendData(agencyId, 'alerts', '7d'),
      this.getRecentActivity(agencyId, 20),
    ]);

    return {
      reportType: 'safety',
      period: { startDate, endDate },
      summary: {
        totalAlerts: alertStats.total_alerts || 0,
        criticalAlerts: alertStats.critical_alerts || 0,
        nearMisses: safetyMetrics.critical_proximities_24h || 0,
        authorityConflicts: safetyMetrics.overlaps_24h || 0,
        avgResponseTime: safetyMetrics.avg_critical_response_seconds || 0,
      },
      trendData,
      breakdown: {
        byType: {
          boundary: alertStats.boundary_alerts || 0,
          proximity: alertStats.proximity_alerts || 0,
          overlap: alertStats.overlap_alerts || 0,
        },
        bySeverity: {
          critical: alertStats.critical_alerts || 0,
          warning: alertStats.warning_alerts || 0,
          informational: alertStats.informational_alerts || 0,
        },
      },
      recommendations: this.generateSafetyRecommendations(alertStats, safetyMetrics),
      recentIncidents: recentIncidents.filter(inc => 
        inc.Action_Type.includes('ALERT') || inc.Action_Type.includes('OVERLAP')
      ),
    };
  }

  generateSafetyRecommendations(alertStats, safetyMetrics) {
    const recommendations = [];
    
    if (safetyMetrics.critical_proximities_24h > 5) {
      recommendations.push({
        severity: 'high',
        title: 'High Proximity Alert Frequency',
        description: `There were ${safetyMetrics.critical_proximities_24h} critical proximity alerts in the last 24 hours. Consider reviewing authority spacing procedures.`,
        action: 'Review work zone setup and authority assignments',
      });
    }
    
    if (safetyMetrics.overlaps_24h > 0) {
      recommendations.push({
        severity: 'high',
        title: 'Authority Overlaps Detected',
        description: `${safetyMetrics.overlaps_24h} authority overlaps detected. These represent potential safety conflicts.`,
        action: 'Investigate overlap incidents and reinforce authority procedures',
      });
    }
    
    if (alertStats.boundary_alerts > alertStats.proximity_alerts * 2) {
      recommendations.push({
        severity: 'medium',
        title: 'High Boundary Alert Rate',
        description: 'Boundary alerts are significantly higher than proximity alerts. Workers may be approaching authority limits frequently.',
        action: 'Consider increasing authority buffer zones for critical areas',
      });
    }
    
    return recommendations;
  }

  async logReportGeneration(agencyId, reportType, userId) {
    try {
      const query = `
        INSERT INTO Report_Logs 
        (Agency_ID, Report_Type, Generated_By, Generated_At, Status)
        VALUES (@Agency_ID, @Report_Type, @Generated_By, GETDATE(), 'generated')
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);
      request.input('Report_Type', db.VarChar, reportType);
      request.input('Generated_By', db.Int, userId);

      await request.query(query);
    } catch (error) {
      logger.error('Failed to log report generation:', error);
    }
  }

  clearCache() {
    this.analyticsCache.clear();
    logger.info('Analytics cache cleared');
  }
}

module.exports = new AnalyticsService();