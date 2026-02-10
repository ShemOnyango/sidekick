const Agency = require('../models/Agency');
const User = require('../models/User');
// Removed unused model imports (they are used via DB seeding/helpers when needed)
const { logger } = require('../config/logger');
const { getConnection, sql } = require('../config/database');

class AgencyController {
  async getAllAgencies(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      
      const result = await Agency.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get agencies error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agencies'
      });
    }
  }

  async getAgencyById(req, res) {
    try {
      const { agencyId } = req.params;
      const agency = await Agency.findById(agencyId);
      
      if (!agency) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      res.json({
        success: true,
        data: { agency }
      });
    } catch (error) {
      logger.error('Get agency error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agency'
      });
    }
  }

  async createAgency(req, res) {
    try {
      const agencyData = req.body;
      
      // Check if agency code already exists
      const existingAgency = await Agency.findByCode(agencyData.agencyCD);
      if (existingAgency) {
        return res.status(400).json({
          success: false,
          error: 'Agency code already exists'
        });
      }

      const agency = await Agency.create(agencyData);

      // Create default configurations for the new agency
      await this.createDefaultConfigurations(agency.Agency_ID);

      logger.info(`New agency created: ${agency.Agency_CD} (${agency.Agency_Name}) by user ${req.user.User_ID}`);

      res.status(201).json({
        success: true,
        data: { agency },
        message: 'Agency created successfully'
      });
    } catch (error) {
      logger.error('Create agency error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create agency'
      });
    }
  }

  async updateAgency(req, res) {
    try {
      const { agencyId } = req.params;
      const updateData = req.body;

      // Check if agency exists
      const existingAgency = await Agency.findById(agencyId);
      if (!existingAgency) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      // Map camelCase to database column names
      const mappedData = {};
      if (updateData.agencyName) mappedData.Agency_Name = updateData.agencyName;
      if (updateData.region) mappedData.Region = updateData.region;
      if (updateData.contactEmail) mappedData.Contact_Email = updateData.contactEmail;
      if (updateData.contactPhone) mappedData.Contact_Phone = updateData.contactPhone;
      
      const agency = await Agency.update(agencyId, mappedData);

      logger.info(`Agency updated: ${agency.Agency_CD} by user ${req.user.User_ID}`);

      res.json({
        success: true,
        data: { agency },
        message: 'Agency updated successfully'
      });
    } catch (error) {
      logger.error('Update agency error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agency'
      });
    }
  }

  async deleteAgency(req, res) {
    try {
      const { agencyId } = req.params;

      // Check if agency exists
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      // Check if agency has active users
      const users = await User.findByAgency(agencyId, 1, 1);
      if (users.total > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete agency with active users'
        });
      }

      // Soft delete (deactivate) the agency
      await Agency.deactivate(agencyId);

      logger.warn(`Agency deactivated: ${agency.Agency_CD} by user ${req.user.User_ID}`);

      res.json({
        success: true,
        message: 'Agency deactivated successfully'
      });
    } catch (error) {
      logger.error('Delete agency error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete agency'
      });
    }
  }

  async getAgencyStats(req, res) {
    try {
      const { agencyId } = req.params;
      
      const pool = getConnection();
      
      // Get agency statistics
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM Users WHERE Agency_ID = @agencyId AND Is_Active = 1) as user_count,
          (SELECT COUNT(*) FROM Subdivisions WHERE Agency_ID = @agencyId AND Is_Active = 1) as subdivision_count,
          (SELECT COUNT(*) FROM Authorities a 
           INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID 
           WHERE s.Agency_ID = @agencyId AND a.Is_Active = 1) as active_authorities,
          (SELECT COUNT(*) FROM Authorities a 
           INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID 
           WHERE s.Agency_ID = @agencyId AND a.End_Tracking_Confirmed = 1 
           AND a.Created_Date >= DATEADD(day, -30, GETDATE())) as completed_authorities_30d,
          (SELECT COUNT(*) FROM Pins p 
           INNER JOIN Authorities a ON p.Authority_ID = a.Authority_ID
           INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID 
           WHERE s.Agency_ID = @agencyId 
           AND p.Created_Date >= DATEADD(day, -7, GETDATE())) as pins_7d
      `;
      
      const statsResult = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .query(statsQuery);
      
      // Get recent activity
      const activityQuery = `
        SELECT TOP 10
          'Authority Created' as activity_type,
          a.Employee_Name_Display as user_name,
          s.Subdivision_Code,
          a.Track_Type + ' ' + a.Track_Number as track,
          a.Created_Date
        FROM Authorities a
        INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
        WHERE s.Agency_ID = @agencyId
          AND a.Created_Date >= DATEADD(day, -7, GETDATE())
        
        UNION ALL
        
        SELECT TOP 10
          'Pin Dropped' as activity_type,
          u.Employee_Name as user_name,
          s.Subdivision_Code,
          p.Track_Type + ' ' + ISNULL(p.Track_Number, '') as track,
          p.Created_Date
        FROM Pins p
        INNER JOIN Authorities a ON p.Authority_ID = a.Authority_ID
        INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
        INNER JOIN Users u ON a.User_ID = u.User_ID
        WHERE s.Agency_ID = @agencyId
          AND p.Created_Date >= DATEADD(day, -7, GETDATE())
        
        ORDER BY Created_Date DESC
      `;
      
      const activityResult = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .query(activityQuery);
      
      res.json({
        success: true,
        data: {
          stats: statsResult.recordset[0],
          recentActivity: activityResult.recordset
        }
      });
    } catch (error) {
      logger.error('Get agency stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agency statistics'
      });
    }
  }

  async createDefaultConfigurations(agencyId) {
    const pool = getConnection();
    
    try {
      // Create default alert configurations
      const alertConfigs = [
        // Boundary Alerts
        { configType: 'Boundary_Alert', alertLevel: 'Informational', distanceMiles: 1.00 },
        { configType: 'Boundary_Alert', alertLevel: 'Warning', distanceMiles: 0.75 },
        { configType: 'Boundary_Alert', alertLevel: 'Critical', distanceMiles: 0.50 },
        
        // Proximity Alerts
        { configType: 'Proximity_Alert', alertLevel: 'Informational', distanceMiles: 1.00 },
        { configType: 'Proximity_Alert', alertLevel: 'Warning', distanceMiles: 0.75 },
        { configType: 'Proximity_Alert', alertLevel: 'Critical', distanceMiles: 0.50 },
        
        // Overlap Alerts
        { configType: 'Overlap_Alert', alertLevel: 'Critical', distanceMiles: 0.00 }
      ];
      
      for (const config of alertConfigs) {
        await pool.request()
          .input('agencyId', sql.Int, agencyId)
          .input('configType', sql.NVarChar, config.configType)
          .input('alertLevel', sql.NVarChar, config.alertLevel)
          .input('distanceMiles', sql.Decimal(5,2), config.distanceMiles)
          .query(`
            INSERT INTO Alert_Configurations (Agency_ID, Config_Type, Alert_Level, Distance_Miles, Is_Active)
            VALUES (@agencyId, @configType, @alertLevel, @distanceMiles, 1)
          `);
      }
      
      // Create default pin types
      const pinTypes = [
        { category: 'Scrap', subtype: 'Scrap - Rail', color: '#FF0000' },
        { category: 'Scrap', subtype: 'Scrap - Ties', color: '#FF9900' },
        { category: 'Monitor', subtype: 'Monitor Location', color: '#0099FF' },
        { category: 'Hazard', subtype: 'Track Obstruction', color: '#FF0000' },
        { category: 'Hazard', subtype: 'Damaged Rail', color: '#990000' },
        { category: 'Hazard', subtype: 'Flooding', color: '#0000FF' }
      ];
      
      for (const pinType of pinTypes) {
        await pool.request()
          .input('agencyId', sql.Int, agencyId)
          .input('category', sql.NVarChar, pinType.category)
          .input('subtype', sql.NVarChar, pinType.subtype)
          .input('color', sql.NVarChar, pinType.color)
          .query(`
            INSERT INTO Pin_Types (Agency_ID, Pin_Category, Pin_Subtype, Color, Is_Active)
            VALUES (@agencyId, @category, @subtype, @color, 1)
          `);
      }
      
      // Create default branding configuration
      await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .query(`
          INSERT INTO Branding_Configurations (Agency_ID, App_Name, Primary_Color, Secondary_Color, Accent_Color)
          VALUES (@agencyId, 'Sidekick', '#000000', '#FFFFFF', '#FFD100')
        `);
      
      logger.info(`Default configurations created for agency ${agencyId}`);
      
    } catch (error) {
      logger.error('Create default configurations error:', error);
      throw error;
    }
  }

  async getAgencySubdivisions(req, res) {
    try {
      const { agencyId } = req.params;
      
      const pool = await getConnection();
      const result = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .query(`
          SELECT 
            Subdivision_ID,
            Subdivision_Code,
            Subdivision_Name,
            Is_Active
          FROM Subdivisions
          WHERE Agency_ID = @agencyId AND Is_Active = 1
          ORDER BY Subdivision_Code
        `);
      
      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      logger.error('Get agency subdivisions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subdivisions'
      });
    }
  }

  async getSubdivisionTracks(req, res) {
    try {
      const { agencyId, subdivisionId } = req.params;
      
      const pool = await getConnection();
      
      // Verify subdivision belongs to agency
      const subdivisionCheck = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(`
          SELECT Subdivision_ID
          FROM Subdivisions
          WHERE Agency_ID = @agencyId AND Subdivision_ID = @subdivisionId
        `);
      
      if (subdivisionCheck.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subdivision not found for this agency'
        });
      }
      
      // Get distinct track numbers for this subdivision
      const result = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(`
          SELECT DISTINCT
            Track_Type,
            Track_Number
          FROM Tracks
          WHERE Subdivision_ID = @subdivisionId
          AND Asset_Status = 'ACTIVE'
          ORDER BY Track_Type, Track_Number
        `);
      
      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      logger.error('Get subdivision tracks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tracks'
      });
    }
  }
}

module.exports = new AgencyController();