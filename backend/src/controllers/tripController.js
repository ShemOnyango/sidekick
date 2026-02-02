// backend/src/controllers/tripController.js
const Trip = require('../models/Trip');
const Authority = require('../models/Authority');
const EmailService = require('../services/emailService');
const { logger } = require('../config/logger');
const PDFService = require('../services/pdfService');
const ExcelService = require('../services/excelService');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

class TripController {
  async generateTripReport(req, res) {
    try {
      const { authorityId } = req.params;
      const { format = 'email', recipients = [] } = req.body;
      const user = req.user;

      // Get authority and trip data
      const authority = await Authority.getAuthorityById(authorityId);
      
      if (!authority) {
        return res.status(404).json({
          success: false,
          error: 'Authority not found'
        });
      }

      // Check permissions
      if (authority.User_ID !== user.User_ID && user.Role !== 'Administrator') {
        return res.status(403).json({
          success: false,
          error: 'You can only generate reports for your own authorities'
        });
      }

      // Get trip data
      const trip = await Trip.getTripByAuthorityId(authorityId);
      const pins = await Trip.getPinsForTrip(trip?.Trip_ID || authorityId);
      const agency = await this.getAgencyInfo(user.Agency_ID);

      const reportData = {
        authority,
        trip,
        pins,
        user,
        agency,
        trackInfo: await this.getTrackInfo(authority.Subdivision_ID, authority.Track_Type, authority.Track_Number),
      };

      let result;

      switch (format.toLowerCase()) {
      case 'pdf':
        result = await this.generatePDFReport(reportData);
        break;
      case 'excel':
        result = await this.generateExcelReport(reportData);
        break;
      case 'email':
      default:
        result = await this.sendEmailReport(reportData, recipients);
        break;
      }

      // Update trip report status
      await Trip.markReportGenerated(authorityId, format, recipients);

      res.json({
        success: true,
        data: result,
        message: `Trip report generated and sent as ${format}`
      });

    } catch (error) {
      logger.error('Generate trip report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate trip report'
      });
    }
  }

  async generatePDFReport(reportData) {
    try {
      const pdfPath = await PDFService.generateTripReport(reportData);
      
      return {
        format: 'pdf',
        filePath: pdfPath,
        downloadUrl: `/api/trips/download/${path.basename(pdfPath)}`,
        size: fs.statSync(pdfPath).size,
      };
    } catch (error) {
      logger.error('Failed to generate PDF report:', error);
      throw error;
    }
  }

  async generateExcelReport(reportData) {
    try {
      const excelPath = await ExcelService.generateTripReport(reportData);
      
      return {
        format: 'excel',
        filePath: excelPath,
        downloadUrl: `/api/trips/download/${path.basename(excelPath)}`,
        size: fs.statSync(excelPath).size,
      };
    } catch (error) {
      logger.error('Failed to generate Excel report:', error);
      throw error;
    }
  }

  async sendEmailReport(reportData, recipients) {
    try {
      // Generate PDF attachment
      const pdfPath = await PDFService.generateTripReport(reportData);
      reportData.pdfPath = pdfPath;

      // Send email
      const emailResult = await EmailService.sendTripReportEmail(reportData, recipients);

      // Clean up temporary file
      setTimeout(() => {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }, 30000);

      return {
        format: 'email',
        messageId: emailResult.messageId,
        recipients: recipients,
        sentTime: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to send email report:', error);
      throw error;
    }
  }

  async getAgencyInfo(agencyId) {
    try {
      const query = `
        SELECT Agency_Name, Agency_CD, Logo_URL, Contact_Email
        FROM Agencies
        WHERE Agency_ID = @Agency_ID
      `;

      const request = new db.Request();
      request.input('Agency_ID', db.Int, agencyId);

      const result = await request.query(query);
      return result.recordset[0] || {};
    } catch (error) {
      logger.error('Failed to get agency info:', error);
      return {};
    }
  }

  async getTrackInfo(subdivisionId, trackType, trackNumber) {
    try {
      const query = `
        SELECT LS, BMP, EMP, Asset_Name
        FROM Tracks
        WHERE Subdivision_ID = @Subdivision_ID
          AND Track_Type = @Track_Type
          AND Track_Number = @Track_Number
          AND Asset_Status = 'ACTIVE'
        ORDER BY BMP
      `;

      const request = new db.Request();
      request.input('Subdivision_ID', db.Int, subdivisionId);
      request.input('Track_Type', db.VarChar, trackType);
      request.input('Track_Number', db.VarChar, trackNumber);

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Failed to get track info:', error);
      return [];
    }
  }

  async getTripHistory(req, res) {
    try {
      const user = req.user;
      const { startDate, endDate, agencyId } = req.query;

      let trips;
      
      if (user.Role === 'Administrator') {
        trips = await Trip.getAgencyTrips(parseInt(agencyId || user.Agency_ID), startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);
      } else {
        trips = await Trip.getUserTrips(user.User_ID, startDate ? new Date(startDate) : null, endDate ? new Date(endDate) : null);
      }

      res.json({
        success: true,
        data: {
          trips,
          count: trips.length,
          totalDuration: this.calculateTotalDuration(trips),
        }
      });
    } catch (error) {
      logger.error('Get trip history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trip history'
      });
    }
  }

  calculateTotalDuration(trips) {
    return trips.reduce((total, trip) => {
      if (trip.Start_Time && trip.End_Time) {
        const start = new Date(trip.Start_Time);
        const end = new Date(trip.End_Time);
        return total + (end - start);
      }
      return total;
    }, 0);
  }
}

module.exports = new TripController();