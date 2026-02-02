const { auth, authorize, agencyAccess, generateToken } = require('../../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');

jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      user: null,
      token: null,
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('auth middleware', () => {
    it('should authenticate valid token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Agency_ID: 1,
        Role: 'Worker',
        Is_Active: true
      };

      req.header.mockReturnValue(`Bearer ${mockToken}`);
      jwt.verify.mockReturnValue({
        userId: 1,
        agencyId: 1
      });
      User.findById.mockResolvedValue(mockUser);

      await auth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET);
      expect(User.findById).toHaveBeenCalledWith(1);
      expect(req.user).toEqual(mockUser);
      expect(req.token).toBe(mockToken);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      req.header.mockReturnValue(null);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication token is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.header.mockReturnValue('Bearer invalid.token');
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      req.header.mockReturnValue('Bearer expired.token');
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired'
      });
    });

    it('should reject inactive user', async () => {
      const mockToken = 'valid.jwt.token';
      const inactiveUser = {
        User_ID: 1,
        Is_Active: false
      };

      req.header.mockReturnValue(`Bearer ${mockToken}`);
      jwt.verify.mockReturnValue({ userId: 1, agencyId: 1 });
      User.findById.mockResolvedValue(inactiveUser);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found or inactive'
      });
    });

    it('should reject user with mismatched agency', async () => {
      const mockToken = 'valid.jwt.token';
      const mockUser = {
        User_ID: 1,
        Agency_ID: 2,
        Is_Active: true
      };

      req.header.mockReturnValue(`Bearer ${mockToken}`);
      jwt.verify.mockReturnValue({
        userId: 1,
        agencyId: 1 // Different from user's actual agency
      });
      User.findById.mockResolvedValue(mockUser);

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });
  });

  describe('authorize middleware', () => {
    it('should allow user with correct role', () => {
      req.user = {
        User_ID: 1,
        Role: 'Administrator'
      };

      const middleware = authorize('Administrator', 'Supervisor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny user with incorrect role', () => {
      req.user = {
        User_ID: 1,
        Role: 'Worker'
      };

      const middleware = authorize('Administrator', 'Supervisor');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Access denied')
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', () => {
      req.user = null;

      const middleware = authorize('Administrator');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('agencyAccess middleware', () => {
    it('should allow administrator to access any agency', async () => {
      req.user = {
        User_ID: 1,
        Role: 'Administrator',
        Agency_ID: 1
      };
      req.params.agencyId = '2';

      await agencyAccess(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user to access own agency', async () => {
      req.user = {
        User_ID: 1,
        Role: 'Worker',
        Agency_ID: 1
      };
      req.params.agencyId = '1';

      await agencyAccess(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user access to other agency', async () => {
      req.user = {
        User_ID: 1,
        Role: 'Worker',
        Agency_ID: 1
      };
      req.params.agencyId = '2';

      await agencyAccess(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied to this agency'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should default to user agency if not specified', async () => {
      req.user = {
        User_ID: 1,
        Role: 'Worker',
        Agency_ID: 1
      };

      await agencyAccess(req, res, next);

      expect(req.params.agencyId).toBe(1);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const mockUser = {
        User_ID: 1,
        Username: 'testuser',
        Agency_ID: 1,
        Role: 'Worker',
        Employee_Name: 'Test User'
      };

      const mockToken = 'generated.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      const token = generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 1,
          username: 'testuser',
          agencyId: 1,
          role: 'Worker',
          employeeName: 'Test User'
        },
        process.env.JWT_SECRET,
        { expiresIn: expect.any(String) }
      );
      expect(token).toBe(mockToken);
    });
  });
});
