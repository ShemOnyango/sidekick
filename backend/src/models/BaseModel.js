const { getConnection, sql } = require('../config/database');
const { logger } = require('../config/logger');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async executeQuery(query, params = {}) {
    const pool = getConnection();
    
    try {
      const request = pool.request();
      
      // Add parameters to request
      Object.keys(params).forEach(key => {
        const value = params[key];
        const paramType = this.getSqlType(value);
        request.input(key, paramType, value);
      });
      
      const result = await request.query(query);
      return result;
    } catch (error) {
      logger.error(`Database query error in ${this.tableName}:`, {
        query,
        params,
        error: error.message
      });
      throw error;
    }
  }

  async executeStoredProcedure(procedureName, params = {}) {
    const pool = getConnection();
    
    try {
      const request = pool.request();
      
      // Add parameters to request
      Object.keys(params).forEach(key => {
        const value = params[key];
        
        if (key.startsWith('output_')) {
          // Output parameters: value can be {type: sql.Type, value: defaultValue} or just the type
          if (value && value.type) {
            request.output(key.replace('output_', ''), value.type, value.value);
          } else {
            // Fallback for old style
            request.output(key.replace('output_', ''), value);
          }
        } else {
          const paramType = this.getSqlType(value);
          request.input(key, paramType, value);
        }
      });
      
      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      logger.error(`Stored procedure error ${procedureName}:`, {
        procedureName,
        params,
        error: error.message
      });
      throw error;
    }
  }

  getSqlType(value) {
    if (value === null || value === undefined) {return sql.NVarChar;}
    
    switch (typeof value) {
    case 'string':
      return sql.NVarChar;
    case 'number':
      return Number.isInteger(value) ? sql.Int : sql.Decimal(10, 4);
    case 'boolean':
      return sql.Bit;
    case 'object':
      if (value instanceof Date) {return sql.DateTime;}
      return sql.NVarChar(sql.MAX);
    default:
      return sql.NVarChar;
    }
  }

  async beginTransaction() {
    const pool = getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
  }

  async commitTransaction(transaction) {
    await transaction.commit();
  }

  async rollbackTransaction(transaction) {
    await transaction.rollback();
  }
}

module.exports = BaseModel;