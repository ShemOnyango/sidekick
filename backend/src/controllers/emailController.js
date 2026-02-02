const logger = require('../config/logger').logger;
const emailService = require('../services/emailService');
const sql = require('mssql');
const { poolPromise } = require('../config/database');

/**
 * Send alert summary email
 */
const sendAlertSummary = async (req, res) => {
  try {
    const { agencyId, date, recipients } = req.body;

    if (!agencyId || !recipients) {
      return res.status(400).json({
        success: false,
        error: 'Agency ID and recipients are required'
      });
    }

    const summaryDate = date || new Date().toISOString().split('T')[0];
    const startDate = new Date(summaryDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(summaryDate);
    endDate.setHours(23, 59, 59, 999);

    const pool = await poolPromise;

    // Get agency details
    const agencyResult = await pool.request()
      .input('agencyId', sql.Int, agencyId)
      .query('SELECT * FROM Agencies WHERE Agency_ID = @agencyId');
    
    const agency = agencyResult.recordset[0];

    // Get proximity alerts for the day
    const proximityAlertsResult = await pool.request()
      .input('agencyId', sql.Int, agencyId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`
        SELECT 
          al.*,
          a.Subdivision_Code,
          a.Track_Type,
          a.Track_Number,
          u.Employee_Name
        FROM Alert_Logs al
        INNER JOIN Authorities a ON al.Authority_ID = a.Authority_ID
        INNER JOIN Users u ON a.User_ID = u.User_ID
        WHERE a.Agency_ID = @agencyId
          AND al.Alert_Time >= @startDate
          AND al.Alert_Time <= @endDate
          AND al.Alert_Type IN ('proximity', 'boundary')
        ORDER BY al.Alert_Time DESC
      `);

    const allAlerts = proximityAlertsResult.recordset;
    const proximityAlerts = allAlerts.filter(a => a.Alert_Type === 'proximity');
    const boundaryAlerts = allAlerts.filter(a => a.Alert_Type === 'boundary');

    // Get authority overlaps created today
    const overlapsResult = await pool.request()
      .input('agencyId', sql.Int, agencyId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`
        WITH OverlappingAuthorities AS (
          SELECT 
            a1.Authority_ID,
            a1.Subdivision_Code,
            a1.Track_Type,
            a1.Track_Number,
            a1.Start_Time,
            STRING_AGG(u.Employee_Name, ', ') WITHIN GROUP (ORDER BY u.Employee_Name) as Workers
          FROM Authorities a1
          INNER JOIN Authorities a2 ON 
            a1.Authority_ID <> a2.Authority_ID
            AND a1.Agency_ID = a2.Agency_ID
            AND a1.Subdivision_Code = a2.Subdivision_Code
            AND a1.Track_Number = a2.Track_Number
            AND a1.Track_Type = a2.Track_Type
            AND (
              (a1.Begin_MP <= a2.End_MP AND a1.End_MP >= a2.Begin_MP)
            )
          INNER JOIN Users u ON a2.User_ID = u.User_ID
          WHERE a1.Agency_ID = @agencyId
            AND a1.Created_At >= @startDate
            AND a1.Created_At <= @endDate
            AND a1.Status = 'active'
          GROUP BY 
            a1.Authority_ID,
            a1.Subdivision_Code,
            a1.Track_Type,
            a1.Track_Number,
            a1.Start_Time
        )
        SELECT * FROM OverlappingAuthorities
      `);

    const authorityOverlaps = overlapsResult.recordset;

    const summaryData = {
      date: summaryDate,
      agency,
      proximityAlerts,
      boundaryAlerts,
      authorityOverlaps,
      totalAlerts: proximityAlerts.length + boundaryAlerts.length + authorityOverlaps.length
    };

    // Send email
    await emailService.sendAlertSummaryEmail(summaryData, recipients);

    res.json({
      success: true,
      message: 'Alert summary email sent successfully',
      data: {
        totalAlerts: summaryData.totalAlerts,
        proximityAlerts: proximityAlerts.length,
        boundaryAlerts: boundaryAlerts.length,
        authorityOverlaps: authorityOverlaps.length
      }
    });
  } catch (error) {
    logger.error('Error sending alert summary email:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send alert summary email'
    });
  }
};

/**
 * Test email configuration
 */
const testEmailConnection = async (req, res) => {
  try {
    const result = await emailService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Error testing email connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test email connection'
    });
  }
};

/**
 * Get email logs
 */
const getEmailLogs = async (req, res) => {
  try {
    const { agencyId, startDate, endDate, type } = req.query;

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        error: 'Agency ID is required'
      });
    }

    const pool = await poolPromise;
    let query = `
      SELECT 
        el.*,
        u.Employee_Name
      FROM Email_Logs el
      LEFT JOIN Users u ON el.User_ID = u.User_ID
      WHERE 1=1
    `;

    const request = pool.request();

    if (type) {
      query += ' AND el.Email_Type = @type';
      request.input('type', sql.VarChar, type);
    }

    if (startDate) {
      query += ' AND el.Sent_At >= @startDate';
      request.input('startDate', sql.DateTime, new Date(startDate));
    }

    if (endDate) {
      query += ' AND el.Sent_At <= @endDate';
      request.input('endDate', sql.DateTime, new Date(endDate));
    }

    query += ' ORDER BY el.Sent_At DESC';

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    logger.error('Error getting email logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get email logs'
    });
  }
};

module.exports = {
  sendAlertSummary,
  testEmailConnection,
  getEmailLogs
};
