const { getConnection, sql } = require('../config/database');
const { logger } = require('../config/logger');
const User = require('../models/User');

class SyncController {
  /**
   * Accepts a batch of sync items from mobile clients and queues them for server-side processing
   * Expected payload: { items: [ { tableName, recordId, operation, data } ] }
   */
  async syncData(req, res) {
    try {
      const user = req.user;
      const deviceIdHeader = req.headers['x-device-id'];
      const items = Array.isArray(req.body.items) ? req.body.items : [];

      if (!items.length) {
        return res.status(400).json({ success: false, error: 'No items to sync' });
      }

      const pool = getConnection();

      // Determine device id: prefer header, otherwise try to find one for the user
      let deviceId = null;
      if (deviceIdHeader) {
        deviceId = parseInt(deviceIdHeader, 10);
      } else {
        try {
          const deviceResult = await pool.request()
            .input('userId', sql.Int, user.User_ID)
            .query(`SELECT TOP 1 Device_ID FROM Mobile_Devices WHERE User_ID = @userId AND Is_Active = 1`);

          if (deviceResult.recordset.length > 0) {
            deviceId = deviceResult.recordset[0].Device_ID;
          }
        } catch (err) {
          logger.warn('Could not determine device id for sync: ' + err.message);
        }
      }

      // Insert each item into Data_Sync_Queue for asynchronous processing
      for (const item of items) {
        const tableName = item.tableName || item.table_name || '';
        const recordId = item.recordId || item.record_id || 0;
        const operation = item.operation || 'INSERT';
        const syncData = JSON.stringify(item.data || item.syncData || {});

        await pool.request()
          .input('deviceId', sql.Int, deviceId)
          .input('tableName', sql.NVarChar, tableName)
          .input('recordId', sql.Int, recordId)
          .input('operation', sql.NVarChar, operation)
          .input('syncData', sql.NVarChar, syncData)
          .query(`
            INSERT INTO Data_Sync_Queue (Device_ID, Table_Name, Record_ID, Operation, Sync_Data)
            VALUES (@deviceId, @tableName, @recordId, @operation, @syncData)
          `);
      }

      res.json({ success: true, message: `${items.length} items queued for sync` });
    } catch (error) {
      logger.error('Sync data error:', error);
      res.status(500).json({ success: false, error: 'Failed to queue sync data' });
    }
  }
}

module.exports = new SyncController();
