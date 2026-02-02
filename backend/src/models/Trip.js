const BaseModel = require('./BaseModel');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

class Trip extends BaseModel {
  constructor() {
    super('Trips');
  }

  async createTripReport(authorityId, sendToEmail = null) {
    // Get trip details
    const tripQuery = `
      SELECT 
        t.*,
        a.*,
        u.Employee_Name,
        u.Employee_Contact,
        u.Email,
        s.Subdivision_Code,
        s.Subdivision_Name,
        ag.Agency_Name,
        (SELECT COUNT(*) FROM Pins p WHERE p.Authority_ID = t.Authority_ID) AS Pin_Count
      FROM Trips t
      INNER JOIN Authorities a ON t.Authority_ID = a.Authority_ID
      INNER JOIN Users u ON t.User_ID = u.User_ID
      INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
      INNER JOIN Agencies ag ON s.Agency_ID = ag.Agency_ID
      WHERE t.Authority_ID = @authorityId
    `;

    const tripResult = await this.executeQuery(tripQuery, { authorityId });
    const trip = tripResult.recordset[0];

    if (!trip) {
      throw new Error('Trip not found');
    }

    // Get pins for this trip
    const pinsQuery = `
      SELECT 
        p.*,
        pt.Pin_Category,
        pt.Pin_Subtype,
        pt.Color
      FROM Pins p
      INNER JOIN Pin_Types pt ON p.Pin_Type_ID = pt.Pin_Type_ID
      WHERE p.Authority_ID = @authorityId
      ORDER BY p.Created_Date
    `;

    const pinsResult = await this.executeQuery(pinsQuery, { authorityId });
    const pins = pinsResult.recordset;

    // Get GPS logs for this trip
    const gpsQuery = `
      SELECT TOP 1000 *
      FROM GPS_Logs
      WHERE Authority_ID = @authorityId
      ORDER BY Created_Date
    `;

    const gpsResult = await this.executeQuery(gpsQuery, { authorityId });
    const gpsLogs = gpsResult.recordset;

    // Update trip record
    const updateQuery = `
      UPDATE Trips
      SET 
        Report_Generated = 1,
        Report_Generated_Time = GETDATE(),
        Report_Sent_To_Email = @sendToEmail
      WHERE Authority_ID = @authorityId
    `;

    await this.executeQuery(updateQuery, { authorityId, sendToEmail });

    return {
      trip,
      pins,
      gpsLogs,
      reportGenerated: new Date()
    };
  }

  async generateExcelReport(reportData) {
    const { trip, pins } = reportData;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Trip Summary Sheet
    const tripSummary = [
      ['Trip Report - Herzog Rail Authority'],
      [''],
      ['Trip ID:', trip.Trip_ID],
      ['Authority ID:', trip.Authority_ID],
      ['Employee:', trip.Employee_Name],
      ['Contact:', trip.Employee_Contact],
      ['Subdivision:', trip.Subdivision_Code + ' - ' + trip.Subdivision_Name],
      ['Track:', trip.Track_Type + ' ' + trip.Track_Number],
      ['Begin MP:', trip.Begin_MP],
      ['End MP:', trip.End_MP],
      ['Start Time:', trip.Start_Time],
      ['End Time:', trip.End_Time || 'Still Active'],
      ['Total Pins:', pins.length],
      [''],
      ['Pin Details:']
    ];
    
    const wsTrip = XLSX.utils.aoa_to_sheet(tripSummary);
    XLSX.utils.book_append_sheet(workbook, wsTrip, 'Trip Summary');
    
    // Pins Sheet
    if (pins.length > 0) {
      const pinHeaders = [
        'Category', 'Subtype', 'Latitude', 'Longitude', 
        'Track Type', 'Track Number', 'MP', 'Notes', 'Time'
      ];
      
      const pinRows = pins.map(pin => [
        pin.Pin_Category,
        pin.Pin_Subtype,
        pin.Latitude,
        pin.Longitude,
        pin.Track_Type || '',
        pin.Track_Number || '',
        pin.MP || '',
        pin.Notes || '',
        pin.Created_Date
      ]);
      
      const wsPins = XLSX.utils.aoa_to_sheet([pinHeaders, ...pinRows]);
      XLSX.utils.book_append_sheet(workbook, wsPins, 'Pins');
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `trip-report-${trip.Authority_ID}-${timestamp}.xlsx`;
    const filepath = path.join(process.env.UPLOAD_PATH || './public/uploads', filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // Write to file
    XLSX.writeFile(workbook, filepath);
    
    return {
      filename,
      filepath,
      downloadUrl: `/uploads/${filename}`
    };
  }

  async generatePDFReport(reportData) {
    // This would be implemented with a PDF library like pdfkit
    // For now, return a placeholder
    return {
      filename: `trip-report-${reportData.trip.Authority_ID}.pdf`,
      filepath: '/path/to/pdf',
      downloadUrl: `/uploads/trip-report-${reportData.trip.Authority_ID}.pdf`
    };
  }

  async getUserTrips(userId, limit = 50) {
    const query = `
      SELECT TOP ${limit}
        t.*,
        a.Begin_MP,
        a.End_MP,
        a.Track_Type,
        a.Track_Number,
        s.Subdivision_Code,
        s.Subdivision_Name,
        (SELECT COUNT(*) FROM Pins p WHERE p.Authority_ID = t.Authority_ID) AS Pin_Count
      FROM Trips t
      INNER JOIN Authorities a ON t.Authority_ID = a.Authority_ID
      INNER JOIN Subdivisions s ON a.Subdivision_ID = s.Subdivision_ID
      WHERE t.User_ID = @userId
      ORDER BY t.Start_Time DESC
    `;

    const result = await this.executeQuery(query, { userId });
    return result.recordset;
  }
}

module.exports = new Trip();