const nodemailer = require('nodemailer');

jest.mock('nodemailer');

// Mock file system
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ size: 0 }))
}));

// Mock winston to prevent file transport issues
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

const emailService = require('../../../src/services/emailService');

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true)
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should verify email connection successfully', async () => {
      const result = await emailService.testConnection();

      expect(result).toEqual({
        success: true,
        message: 'Email connection successful'
      });
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.testConnection();

      expect(result).toEqual({
        success: false,
        message: 'Email connection failed: Connection failed'
      });
    });
  });

  describe('sendAuthorityOverlapEmail', () => {
    it('should send overlap notification email', async () => {
      const overlapData = {
        newAuthority: {
          Authority_ID: 1,
          Employee_Name_Display: 'John Doe',
          Employee_Contact_Display: '555-0001',
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Begin_MP: 10.0,
          End_MP: 15.0,
          Start_Time: new Date()
        },
        conflictingAuthorities: [
          {
            Employee_Name_Display: 'Jane Smith',
            Employee_Contact_Display: '555-0002',
            Track_Type: 'Main',
            Track_Number: '1',
            Begin_MP: 12.0,
            End_MP: 18.0,
            Start_Time: new Date()
          }
        ],
        user: {
          User_ID: 1,
          Employee_Name: 'John Doe'
        },
        agency: {
          Agency_Name: 'Test Agency'
        }
      };

      const adminEmails = ['admin@test.com', 'supervisor@test.com'];

      const result = await emailService.sendAuthorityOverlapEmail(overlapData, adminEmails);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: adminEmails,
          subject: expect.stringContaining('Authority Overlap Alert'),
          html: expect.stringContaining('John Doe')
        })
      );
      expect(result.messageId).toBe('test-message-id');
    });

    it('should throw error if transporter not initialized', async () => {
      emailService.transporter = null;

      await expect(
        emailService.sendAuthorityOverlapEmail({}, [])
      ).rejects.toThrow('Email transporter not initialized');
    });
  });

  describe('sendAlertSummaryEmail', () => {
    it('should send daily alert summary', async () => {
      const summaryData = {
        date: '2026-01-29',
        agency: { Agency_Name: 'Test Agency' },
        proximityAlerts: [
          {
            Alert_Level: 'Critical',
            Message: 'Workers within 0.25 miles',
            Alert_Time: new Date()
          }
        ],
        boundaryAlerts: [
          {
            Alert_Level: 'Warning',
            Message: 'Approaching authority boundary',
            Alert_Time: new Date()
          }
        ],
        authorityOverlaps: [
          {
            Subdivision_Code: 'SUB1',
            Track_Type: 'Main',
            Track_Number: '1',
            Workers: ['Worker 1', 'Worker 2'],
            Start_Time: new Date()
          }
        ],
        totalAlerts: 3
      };

      const recipients = ['admin@test.com'];

      const result = await emailService.sendAlertSummaryEmail(summaryData, recipients);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipients,
          subject: expect.stringContaining('Daily Alert Summary'),
          html: expect.stringContaining('Test Agency')
        })
      );
      expect(result.messageId).toBe('test-message-id');
    });

    it('should handle empty alert summary', async () => {
      const summaryData = {
        date: '2026-01-29',
        agency: { Agency_Name: 'Test Agency' },
        proximityAlerts: [],
        boundaryAlerts: [],
        authorityOverlaps: [],
        totalAlerts: 0
      };

      await emailService.sendAlertSummaryEmail(summaryData, ['admin@test.com']);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('No alerts')
        })
      );
    });
  });

  describe('sendTripReportEmail', () => {
    it('should send trip report with attachments', async () => {
      const tripData = {
        authority: {
          Authority_ID: 1,
          Subdivision_Code: 'SUB1',
          Track_Type: 'Main',
          Track_Number: '1',
          Begin_MP: 10.0,
          End_MP: 15.0,
          Start_Time: new Date(),
          End_Time: new Date()
        },
        user: {
          Employee_Name: 'John Doe',
          Employee_Contact: '555-0001'
        },
        pins: [
          {
            Pin_Category: 'Safety',
            Pin_Subtype: 'Hazard',
            MP: 12.5,
            Description: 'Track obstruction'
          }
        ],
        agency: {
          Agency_Name: 'Test Agency'
        }
      };

      const recipient = 'supervisor@test.com';
      const attachments = [
        {
          filename: 'report.pdf',
          path: '/path/to/report.pdf'
        }
      ];

      const result = await emailService.sendTripReportEmail(tripData, recipient, attachments);

      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipient,
          subject: expect.stringContaining('Trip Report'),
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: 'report.pdf' })
          ])
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle SMTP errors gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        emailService.sendAuthorityOverlapEmail({
          newAuthority: {},
          conflictingAuthorities: [],
          user: {},
          agency: {}
        }, ['test@test.com'])
      ).rejects.toThrow('SMTP Error');
    });

    it('should handle missing required data', async () => {
      await expect(
        emailService.sendAuthorityOverlapEmail(null, null)
      ).rejects.toThrow();
    });
  });

  describe('Email Formatting', () => {
    it('should format dates correctly in emails', async () => {
      const testDate = new Date('2026-01-29T10:30:00Z');
      const summaryData = {
        date: '2026-01-29',
        agency: { Agency_Name: 'Test' },
        proximityAlerts: [{ Alert_Time: testDate, Alert_Level: 'Info', Message: 'Test' }],
        boundaryAlerts: [],
        authorityOverlaps: [],
        totalAlerts: 1
      };

      await emailService.sendAlertSummaryEmail(summaryData, ['test@test.com']);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format
    });

    it('should include all alert details in summary', async () => {
      const summaryData = {
        date: '2026-01-29',
        agency: { Agency_Name: 'Test Agency' },
        proximityAlerts: [
          { Alert_Level: 'Critical', Message: 'Critical alert', Alert_Time: new Date() },
          { Alert_Level: 'Warning', Message: 'Warning alert', Alert_Time: new Date() }
        ],
        boundaryAlerts: [],
        authorityOverlaps: [],
        totalAlerts: 2
      };

      await emailService.sendAlertSummaryEmail(summaryData, ['test@test.com']);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Critical alert');
      expect(emailCall.html).toContain('Warning alert');
    });
  });
});
