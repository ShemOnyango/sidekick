const OfflineDownload = require('../models/OfflineDownload');
const Agency = require('../models/Agency');
const { logger } = require('../config/logger');
const db = require('../config/database');
const sql = require('mssql');

class OfflineController {
  /**
   * Get agency data package for offline use
   */
  async downloadAgencyData(req, res) {
    try {
      const { agencyId } = req.params;
      const user = req.user;
      const deviceId = req.headers['x-device-id'] || 'unknown';

      // Verify user has access to this agency
      if (user.Role !== 'Administrator' && user.Agency_ID !== parseInt(agencyId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this agency data'
        });
      }

      // Get agency with subdivisions
      const agency = await Agency.getAgencyWithSubdivisions(agencyId);
      
      if (!agency) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      // Track download - disabled due to schema mismatch
      // TODO: Fix OfflineDownload model to match actual database schema
      logger.info(`Agency data downloaded: Agency ${agencyId} by user ${user.User_ID}`);

      res.json({
        success: true,
        data: {
          agency,
          downloadedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    } catch (error) {
      logger.error('Download agency data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download agency data'
      });
    }
  }

  /**
   * Get subdivision data with milepost geometry
   */
  async downloadSubdivisionData(req, res) {
    try {
      const { agencyId, subdivisionId } = req.params;
      const user = req.user;
      const deviceId = req.headers['x-device-id'] || 'unknown';

      // Verify access
      if (user.Role !== 'Administrator' && user.Agency_ID !== parseInt(agencyId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const pool = await db.connectToDatabase();
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Get subdivision details
      const subdivisionQuery = `
        SELECT 
          s.*,
          a.Agency_Name,
          a.Agency_CD
        FROM Subdivisions s
        INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
        WHERE s.Subdivision_ID = @subdivisionId
          AND s.Agency_ID = @agencyId
          AND s.Is_Active = 1
      `;

      const subdivisionResult = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .input('agencyId', sql.Int, agencyId)
        .query(subdivisionQuery);

      if (subdivisionResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subdivision not found'
        });
      }

      const subdivision = subdivisionResult.recordset[0];

      // Get milepost geometry
      const geometryQuery = `
        SELECT 
          MP,
          Latitude,
          Longitude
        FROM Milepost_Geometry
        WHERE Subdivision_ID = @subdivisionId
        ORDER BY MP
      `;

      const geometryResult = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(geometryQuery);

      // Get tracks
      const tracksQuery = `
        SELECT *
        FROM Tracks
        WHERE Subdivision_ID = @subdivisionId
        ORDER BY Track_Type, Track_Number, Begin_MP
      `;

      const tracksResult = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(tracksQuery);

      const data = {
        subdivision,
        mileposts: geometryResult.recordset.map(mp => ({
          ...mp,
          Milepost: mp.MP  // Add Milepost field for compatibility
        })),
        tracks: tracksResult.recordset,
        metadata: {
          totalMileposts: geometryResult.recordset.length,
          totalTracks: tracksResult.recordset.length,
          trackTypes: [...new Set(tracksResult.recordset.map(t => t.Track_Type))]
        }
      };

      // Track download - disabled due to schema mismatch
      // TODO: Fix OfflineDownload model to match actual database schema
      logger.info(`Subdivision data downloaded: Subdivision ${subdivisionId} by user ${user.User_ID}`);

      res.json({
        success: true,
        data: {
          ...data,
          downloadedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (error) {
      logger.error('Download subdivision data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download subdivision data'
      });
    }
  }

  /**
   * Get subdivision data with milepost geometry (uses user's agency from token)
   */
  /**
   * Get subdivision data with milepost geometry (uses user's agency from token)
   */
  async downloadSubdivisionDataByUser(req, res) {
    try {
      const { subdivisionId } = req.params;
      const user = req.user;
      const agencyId = user.Agency_ID;
      const deviceId = req.headers['x-device-id'] || 'unknown';

      const pool = await db.connectToDatabase();
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Get subdivision details
      const subdivisionQuery = `
        SELECT 
          s.*,
          a.Agency_Name,
          a.Agency_CD
        FROM Subdivisions s
        INNER JOIN Agencies a ON s.Agency_ID = a.Agency_ID
        WHERE s.Subdivision_ID = @subdivisionId
          AND s.Agency_ID = @agencyId
          AND s.Is_Active = 1
      `;

      const subdivisionResult = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .input('agencyId', sql.Int, agencyId)
        .query(subdivisionQuery);

      if (subdivisionResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subdivision not found'
        });
      }

      const subdivision = subdivisionResult.recordset[0];

      // Get milepost reference points from Track_Mileposts table
      // NOTE: Track_Mileposts only has: Milepost_ID, Subdivision_ID, Milepost, Latitude, Longitude
      const milepostQuery = `
        SELECT 
          Milepost_ID,
          Subdivision_ID,
          Milepost,
          Latitude,
          Longitude
        FROM Track_Mileposts
        WHERE Subdivision_ID = @subdivisionId
        ORDER BY Milepost
      `;

      const milepostResult = await pool.request()
        .input('subdivisionId', sql.Int, subdivisionId)
        .query(milepostQuery);

      const data = {
        subdivision,
        mileposts: milepostResult.recordset,
        metadata: {
          totalMileposts: milepostResult.recordset.length
        }
      };

      // Track download - disabled due to schema mismatch
      // TODO: Fix OfflineDownload model to match actual database schema
      logger.info(`Subdivision data downloaded by user: Subdivision ${subdivisionId} by user ${user.User_ID}`);

      res.json({
        success: true,
        data: {
          ...data,
          downloadedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (error) {
      logger.error('Download subdivision data by user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download subdivision data'
      });
    }
  }

  /**
   * Get user's download history
   */
  async getDownloadHistory(req, res) {
    try {
      const user = req.user;
      const deviceId = req.headers['x-device-id'];

      const downloads = await OfflineDownload.getUserDownloads(user.User_ID, deviceId);

      res.json({
        success: true,
        data: {
          downloads,
          count: downloads.length
        }
      });
    } catch (error) {
      logger.error('Get download history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get download history'
      });
    }
  }

  /**
   * Check if offline data needs update
   */
  async checkDownloadStatus(req, res) {
    try {
      const { downloadType, subdivisionId } = req.query;
      const user = req.user;
      const deviceId = req.headers['x-device-id'];

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required'
        });
      }

      const status = await OfflineDownload.checkDownloadStatus(
        user.User_ID,
        deviceId,
        downloadType,
        subdivisionId ? parseInt(subdivisionId) : null
      );

      const needsUpdate = !status || (status && !status.Is_Fresh);

      res.json({
        success: true,
        data: {
          hasDownload: !!status,
          needsUpdate,
          lastDownload: status ? status.Downloaded_Date : null,
          daysOld: status ? status.Days_Old : null,
          isFresh: status ? status.Is_Fresh : false
        }
      });
    } catch (error) {
      logger.error('Check download status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check download status'
      });
    }
  }

  /**
   * Get available downloads for user's agency
   */
  async getAvailableDownloads(req, res) {
    try {
      const user = req.user;
      const pool = await db.connectToDatabase();
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Get subdivisions for user's agency
      const query = `
        SELECT 
          s.Subdivision_ID,
          s.Subdivision_Code,
          s.Subdivision_Name,
          s.Region,
          COUNT(DISTINCT t.Track_ID) AS Track_Count,
          COUNT(DISTINCT mg.MP) AS Milepost_Count,
          MIN(t.Begin_MP) AS Min_MP,
          MAX(t.End_MP) AS Max_MP
        FROM Subdivisions s
        LEFT JOIN Tracks t ON s.Subdivision_ID = t.Subdivision_ID AND t.Is_Active = 1
        LEFT JOIN Milepost_Geometry mg ON s.Subdivision_ID = mg.Subdivision_ID AND mg.Is_Active = 1
        WHERE s.Agency_ID = @agencyId
          AND s.Is_Active = 1
        GROUP BY s.Subdivision_ID, s.Subdivision_Code, s.Subdivision_Name, s.Region
        ORDER BY s.Subdivision_Name
      `;

      const result = await pool.request()
        .input('agencyId', sql.Int, user.Agency_ID)
        .query(query);

      res.json({
        success: true,
        data: {
          agency: {
            Agency_ID: user.Agency_ID,
            Agency_Name: user.Agency_Name
          },
          subdivisions: result.recordset,
          downloadTypes: [
            { type: 'Agency_Data', description: 'Basic agency and subdivision list' },
            { type: 'Subdivision_Data', description: 'Full subdivision with tracks and milepost geometry' }
          ]
        }
      });
    } catch (error) {
      logger.error('Get available downloads error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available downloads'
      });
    }
  }

  /**
   * Invalidate old downloads
   */
  async invalidateOldDownloads(req, res) {
    try {
      const { downloadType } = req.body;
      const user = req.user;
      const deviceId = req.headers['x-device-id'];

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required'
        });
      }

      const count = await OfflineDownload.invalidateOldDownloads(
        user.User_ID,
        deviceId,
        downloadType
      );

      res.json({
        success: true,
        data: {
          invalidatedCount: count
        }
      });
    } catch (error) {
      logger.error('Invalidate downloads error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate downloads'
      });
    }
  }
}

module.exports = new OfflineController();
