const BaseModel = require('./BaseModel');

class OfflineDownload extends BaseModel {
  constructor() {
    super('Offline_Downloads');
  }

  /**
   * Create or update offline download record
   */
  async upsertDownload(downloadData) {
    const {
      userId,
      deviceId,
      agencyId,
      subdivisionId = null,
      downloadType,
      dataSize = 0
    } = downloadData;

    const query = `
      MERGE Offline_Downloads AS target
      USING (SELECT 
        @userId AS User_ID,
        @deviceId AS Device_ID,
        @agencyId AS Agency_ID,
        @subdivisionId AS Subdivision_ID,
        @downloadType AS Download_Type
      ) AS source
      ON (
        target.User_ID = source.User_ID AND 
        target.Device_ID = source.Device_ID AND
        target.Download_Type = source.Download_Type AND
        (target.Subdivision_ID = source.Subdivision_ID OR (target.Subdivision_ID IS NULL AND source.Subdivision_ID IS NULL))
      )
      WHEN MATCHED THEN
        UPDATE SET 
          Downloaded_Date = GETDATE(),
          Data_Size_MB = @dataSize,
          Is_Current = 1
      WHEN NOT MATCHED THEN
        INSERT (User_ID, Device_ID, Agency_ID, Subdivision_ID, Download_Type, Downloaded_Date, Data_Size_MB, Is_Current)
        VALUES (@userId, @deviceId, @agencyId, @subdivisionId, @downloadType, GETDATE(), @dataSize, 1)
      OUTPUT inserted.*;
    `;

    const result = await this.executeQuery(query, {
      userId,
      deviceId,
      agencyId,
      subdivisionId,
      downloadType,
      dataSize
    });

    return result.recordset[0];
  }

  /**
   * Get user's download history
   */
  async getUserDownloads(userId, deviceId = null) {
    let query = `
      SELECT 
        od.*,
        a.Agency_Name,
        a.Agency_CD,
        s.Subdivision_Name,
        s.Subdivision_Code,
        DATEDIFF(DAY, od.Downloaded_Date, GETDATE()) AS Days_Since_Download
      FROM Offline_Downloads od
      INNER JOIN Agencies a ON od.Agency_ID = a.Agency_ID
      LEFT JOIN Subdivisions s ON od.Subdivision_ID = s.Subdivision_ID
      WHERE od.User_ID = @userId AND od.Is_Current = 1
    `;

    const params = { userId };

    if (deviceId) {
      query += ' AND od.Device_ID = @deviceId';
      params.deviceId = deviceId;
    }

    query += ' ORDER BY od.Downloaded_Date DESC';

    const result = await this.executeQuery(query, params);
    return result.recordset;
  }

  /**
   * Check if download is current (within 30 days)
   */
  async checkDownloadStatus(userId, deviceId, downloadType, subdivisionId = null) {
    const query = `
      SELECT 
        *,
        DATEDIFF(DAY, Downloaded_Date, GETDATE()) AS Days_Old,
        CASE 
          WHEN DATEDIFF(DAY, Downloaded_Date, GETDATE()) <= 30 THEN 1
          ELSE 0
        END AS Is_Fresh
      FROM Offline_Downloads
      WHERE User_ID = @userId
        AND Device_ID = @deviceId
        AND Download_Type = @downloadType
        AND Is_Current = 1
        ${subdivisionId ? 'AND Subdivision_ID = @subdivisionId' : ''}
    `;

    const result = await this.executeQuery(query, {
      userId,
      deviceId,
      downloadType,
      subdivisionId
    });

    return result.recordset[0] || null;
  }

  /**
   * Mark old downloads as not current
   */
  async invalidateOldDownloads(userId, deviceId, downloadType) {
    const query = `
      UPDATE Offline_Downloads
      SET Is_Current = 0
      WHERE User_ID = @userId
        AND Device_ID = @deviceId
        AND Download_Type = @downloadType
        AND DATEDIFF(DAY, Downloaded_Date, GETDATE()) > 30
    `;

    const result = await this.executeQuery(query, { userId, deviceId, downloadType });
    return result.rowsAffected[0];
  }

  /**
   * Get download statistics by agency
   */
  async getAgencyDownloadStats(agencyId) {
    const query = `
      SELECT 
        Download_Type,
        COUNT(DISTINCT User_ID) AS Unique_Users,
        COUNT(*) AS Total_Downloads,
        SUM(Data_Size_MB) AS Total_Size_MB,
        AVG(Data_Size_MB) AS Avg_Size_MB,
        MAX(Downloaded_Date) AS Last_Download
      FROM Offline_Downloads
      WHERE Agency_ID = @agencyId
        AND Is_Current = 1
      GROUP BY Download_Type
      ORDER BY Total_Downloads DESC
    `;

    const result = await this.executeQuery(query, { agencyId });
    return result.recordset;
  }
}

module.exports = new OfflineDownload();
