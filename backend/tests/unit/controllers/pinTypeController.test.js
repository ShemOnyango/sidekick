const pinTypeController = require('../../../src/controllers/pinTypeController');
const pinTypeModel = require('../../../src/models/PinType');

// Mock the PinType model
jest.mock('../../../src/models/PinType');

describe('PinType Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {
        User_ID: 1,
        role: 'Administrator',
        agencyId: 1
      }
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('getPinTypes', () => {
    it('should get all pin types for an agency', async () => {
      req.params.agencyId = '1';
      const mockPinTypes = [
        {
          Pin_Type_ID: 1,
          Pin_Category: 'Safety',
          Pin_Subtype: 'Hazard',
          Color: '#FF0000',
          Icon_URL: '/icons/hazard.png',
          Sort_Order: 1,
          Is_Active: true
        },
        {
          Pin_Type_ID: 2,
          Pin_Category: 'Safety',
          Pin_Subtype: 'Warning',
          Color: '#FFA500',
          Icon_URL: '/icons/warning.png',
          Sort_Order: 2,
          Is_Active: true
        }
      ];

      pinTypeModel.findByAgency.mockResolvedValue(mockPinTypes);

      await pinTypeController.getPinTypes(req, res);

      expect(pinTypeModel.findByAgency).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          pinTypes: expect.any(Object),
          total: 2
        })
      });
    });

    it('should deny access to other agency pin types for non-admin', async () => {
      req.user.role = 'Supervisor';
      req.user.agencyId = 1;
      req.params.agencyId = '2';

      await pinTypeController.getPinTypes(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Access denied')
      });
    });

    it('should handle errors gracefully', async () => {
      req.params.agencyId = '1';
      pinTypeModel.findByAgency.mockRejectedValue(new Error('Database error'));

      await pinTypeController.getPinTypes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve pin types',
        error: 'Database error'
      });
    });
  });

  describe('createPinType', () => {
    it('should create a new pin type', async () => {
      req.params.agencyId = '1';
      req.body = {
        category: 'Safety',
        subtype: 'Hazard',
        color: '#FF0000',
        iconUrl: '/icons/hazard.png',
        sortOrder: 1
      };

      const mockCreatedPinType = {
        Pin_Type_ID: 1,
        ...req.body
      };

      pinTypeModel.create.mockResolvedValue(mockCreatedPinType);

      await pinTypeController.createPinType(req, res);

      expect(pinTypeModel.create).toHaveBeenCalledWith({
        agencyId: '1',
        pinCategory: 'Safety',
        pinSubtype: 'Hazard',
        color: '#FF0000',
        iconUrl: '/icons/hazard.png',
        sortOrder: 1
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedPinType,
        message: 'Pin type created successfully'
      });
    });

    it('should reject invalid color format', async () => {
      req.params.agencyId = '1';
      req.body = {
        category: 'Safety',
        subtype: 'Hazard',
        color: 'red', // Invalid format
        iconUrl: '/icons/hazard.png'
      };

      await pinTypeController.createPinType(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('hex format')
      });
    });

    it('should only allow administrators to create pin types', async () => {
      req.user.Role = 'Worker';
      req.params.agencyId = '1';
      req.body = {
        category: 'Safety',
        subtype: 'Hazard',
        color: '#FF0000'
      };

      await pinTypeController.createPinType(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Only administrators')
      });
    });
  });

  describe('updatePinType', () => {
    it('should update a pin type', async () => {
      req.params.agencyId = '1';
      req.params.pinTypeId = '1';
      req.body = {
        color: '#00FF00',
        sortOrder: 5
      };

      const mockUpdatedPinType = {
        Pin_Type_ID: 1,
        Pin_Category: 'Safety',
        Color: '#00FF00',
        Sort_Order: 5
      };

      pinTypeModel.update.mockResolvedValue(mockUpdatedPinType);

      await pinTypeController.updatePinType(req, res);

      expect(pinTypeModel.update).toHaveBeenCalledWith('1', {
        Color: '#00FF00',
        Sort_Order: 5
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedPinType,
        message: 'Pin type updated successfully'
      });
    });

    it('should return 404 if pin type not found', async () => {
      req.params.agencyId = '1';
      req.params.pinTypeId = '999';
      req.body = { color: '#00FF00' };

      pinTypeModel.update.mockResolvedValue(null);

      await pinTypeController.updatePinType(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Pin type not found'
      });
    });
  });

  describe('deletePinType', () => {
    it('should soft delete a pin type', async () => {
      req.params.agencyId = '1';
      req.params.pinTypeId = '1';

      const mockDeletedPinType = {
        Pin_Type_ID: 1,
        Is_Active: false
      };

      pinTypeModel.update.mockResolvedValue(mockDeletedPinType);

      await pinTypeController.deletePinType(req, res);

      expect(pinTypeModel.update).toHaveBeenCalledWith('1', { Is_Active: false });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Pin type deleted successfully'
      });
    });

    it('should only allow administrators to delete pin types', async () => {
      req.user.Role = 'Supervisor';
      req.params.agencyId = '1';
      req.params.pinTypeId = '1';

      await pinTypeController.deletePinType(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Only administrators')
      });
    });
  });

  describe('getPinCategories', () => {
    it('should get unique pin categories', async () => {
      req.params.agencyId = '1';
      const mockPinTypes = [
        { Pin_Category: 'Safety' },
        { Pin_Category: 'Safety' },
        { Pin_Category: 'Maintenance' },
        { Pin_Category: 'Equipment' }
      ];

      pinTypeModel.findByAgency.mockResolvedValue(mockPinTypes);

      await pinTypeController.getPinCategories(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          categories: ['Safety', 'Maintenance', 'Equipment']
        }
      });
    });
  });
});
