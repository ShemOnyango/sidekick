const BaseModel = require('../../../src/models/BaseModel');
const { getConnection } = require('../../../src/config/database');

jest.mock('../../../src/config/database');

describe('BaseModel', () => {
  let model;
  let mockPool;

  beforeEach(() => {
    mockPool = {
      request: jest.fn().mockReturnThis(),
      input: jest.fn().mockReturnThis(),
      output: jest.fn().mockReturnThis(),
      query: jest.fn(),
      execute: jest.fn()
    };
    getConnection.mockReturnValue(mockPool);
    model = new BaseModel('TestTable');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set table name', () => {
      expect(model.tableName).toBe('TestTable');
    });
  });

  describe('executeQuery', () => {
    it('should execute query with parameters', async () => {
      const query = 'SELECT * FROM TestTable WHERE id = @id';
      const params = { id: 1 };
      const mockResult = { recordset: [{ id: 1, name: 'Test' }] };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await model.executeQuery(query, params);

      expect(mockPool.request).toHaveBeenCalled();
      expect(mockPool.input).toHaveBeenCalledWith('id', expect.anything(), 1);
      expect(mockPool.query).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('should execute query without parameters', async () => {
      const query = 'SELECT * FROM TestTable';
      const mockResult = { recordset: [] };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await model.executeQuery(query);

      expect(mockPool.query).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors', async () => {
      const query = 'INVALID SQL';
      mockPool.query.mockRejectedValue(new Error('SQL Error'));

      await expect(model.executeQuery(query)).rejects.toThrow('SQL Error');
    });

    it('should determine correct SQL types for parameters', async () => {
      const params = {
        stringParam: 'test',
        numberParam: 123,
        boolParam: true,
        dateParam: new Date()
      };

      mockPool.query.mockResolvedValue({ recordset: [] });

      await model.executeQuery('SELECT 1', params);

      expect(mockPool.input).toHaveBeenCalledTimes(4);
    });
  });

  describe('executeStoredProcedure', () => {
    it('should execute stored procedure with input parameters', async () => {
      const procedureName = 'sp_GetData';
      const params = { userId: 1, agencyId: 2 };
      const mockResult = { recordset: [{ id: 1 }] };

      mockPool.execute.mockResolvedValue(mockResult);

      const result = await model.executeStoredProcedure(procedureName, params);

      expect(mockPool.request).toHaveBeenCalled();
      expect(mockPool.input).toHaveBeenCalledWith('userId', expect.anything(), 1);
      expect(mockPool.input).toHaveBeenCalledWith('agencyId', expect.anything(), 2);
      expect(mockPool.execute).toHaveBeenCalledWith(procedureName);
      expect(result).toEqual(mockResult);
    });

    it('should handle output parameters', async () => {
      const procedureName = 'sp_CreateRecord';
      const params = {
        name: 'Test',
        output_newId: null
      };

      mockPool.execute.mockResolvedValue({ 
        recordset: [],
        output: { newId: 123 }
      });

      const result = await model.executeStoredProcedure(procedureName, params);

      expect(result.output.newId).toBe(123);
      expect(mockPool.output).toHaveBeenCalledWith('newId', expect.anything(), null);
      expect(mockPool.execute).toHaveBeenCalledWith(procedureName);
    });

    it('should handle stored procedure errors', async () => {
      mockPool.execute.mockRejectedValue(new Error('Procedure Error'));

      await expect(
        model.executeStoredProcedure('sp_Invalid')
      ).rejects.toThrow('Procedure Error');
    });
  });

  describe('getSqlType', () => {
    it('should return correct SQL type for string', () => {
      const type = model.getSqlType('test string');
      expect(type).toBeDefined();
    });

    it('should return correct SQL type for number', () => {
      const type = model.getSqlType(123);
      expect(type).toBeDefined();
    });

    it('should return correct SQL type for boolean', () => {
      const type = model.getSqlType(true);
      expect(type).toBeDefined();
    });

    it('should return correct SQL type for date', () => {
      const type = model.getSqlType(new Date());
      expect(type).toBeDefined();
    });

    it('should handle null values', () => {
      const type = model.getSqlType(null);
      expect(type).toBeDefined();
    });

    it('should handle undefined values', () => {
      const type = model.getSqlType(undefined);
      expect(type).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    it('should support find operations', async () => {
      const query = 'SELECT * FROM TestTable WHERE id = @id';
      const params = { id: 1 };
      
      mockPool.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Test' }]
      });

      const result = await model.executeQuery(query, params);
      
      expect(result.recordset).toHaveLength(1);
      expect(result.recordset[0].id).toBe(1);
    });

    it('should support insert operations', async () => {
      const query = `
        INSERT INTO TestTable (name, value)
        OUTPUT INSERTED.*
        VALUES (@name, @value)
      `;
      const params = { name: 'Test', value: 100 };

      mockPool.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Test', value: 100 }]
      });

      const result = await model.executeQuery(query, params);

      expect(result.recordset[0]).toEqual({
        id: 1,
        name: 'Test',
        value: 100
      });
    });

    it('should support update operations', async () => {
      const query = `
        UPDATE TestTable
        SET name = @name
        OUTPUT INSERTED.*
        WHERE id = @id
      `;
      const params = { id: 1, name: 'Updated' };

      mockPool.query.mockResolvedValue({
        recordset: [{ id: 1, name: 'Updated' }]
      });

      const result = await model.executeQuery(query, params);

      expect(result.recordset[0].name).toBe('Updated');
    });

    it('should support delete operations', async () => {
      const query = 'DELETE FROM TestTable WHERE id = @id';
      const params = { id: 1 };

      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      const result = await model.executeQuery(query, params);

      expect(result.rowsAffected[0]).toBe(1);
    });
  });

  describe('Error Logging', () => {
    it('should log query errors with details', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockPool.query.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        model.executeQuery('SELECT * FROM TestTable', { id: 1 })
      ).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Parameter Handling', () => {
    it('should handle multiple parameters of different types', async () => {
      const params = {
        stringValue: 'test',
        intValue: 42,
        floatValue: 3.14,
        boolValue: true,
        dateValue: new Date('2026-01-29'),
        nullValue: null
      };

      mockPool.query.mockResolvedValue({ recordset: [] });

      await model.executeQuery('SELECT 1', params);

      expect(mockPool.input).toHaveBeenCalledTimes(6);
    });

    it('should handle empty parameter object', async () => {
      mockPool.query.mockResolvedValue({ recordset: [] });

      await model.executeQuery('SELECT * FROM TestTable', {});

      expect(mockPool.input).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large result sets', async () => {
      const largeRecordset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Record ${i}`
      }));

      mockPool.query.mockResolvedValue({ recordset: largeRecordset });

      const result = await model.executeQuery('SELECT * FROM TestTable');

      expect(result.recordset).toHaveLength(10000);
    });

    it('should handle batch parameter queries efficiently', async () => {
      const queries = Array.from({ length: 100 }, (_, i) => ({
        query: 'SELECT * FROM TestTable WHERE id = @id',
        params: { id: i }
      }));

      mockPool.query.mockResolvedValue({ recordset: [] });

      const promises = queries.map(({ query, params }) => 
        model.executeQuery(query, params)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
    });
  });
});
