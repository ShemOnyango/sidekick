const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'HerzogRailAuthority',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false, // Use true for Azure
    trustServerCertificate: true, // For self-signed certificates
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create connection pool
let pool = null;

const connectToDatabase = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log('Connected to SQL Server successfully');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    // Don't exit the process in development; allow server to start and handle DB absence at runtime
    pool = null;
    return null;
  }
};

// Wrapper to get the pool if available
const getConnection = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectToDatabase first or ensure DB is reachable.');
  }
  return pool;
};

// Request wrapper used across the codebase (so existing `new db.Request()` calls work)
function Request() {
  if (pool) {
    return pool.request();
  }

  // Return a safe mock request that supports chaining but fails gracefully on execution
  const mock = {
    _inputs: {},
    input(name, type, value) {
      this._inputs[name] = value;
      return this;
    },
    // support .query and .execute returning rejected promises so callers can handle errors asynchronously
    query() {
      return Promise.reject(Object.assign(new Error('Database not connected'), { code: 'DB_NOT_CONNECTED' }));
    },
    execute() {
      return Promise.reject(Object.assign(new Error('Database not connected'), { code: 'DB_NOT_CONNECTED' }));
    }
  };

  return mock;
}

const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
      pool = null;
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

module.exports = {
  sql,
  connectToDatabase,
  getConnection,
  closeConnection,
  Request,
  // re-export common SQL types for convenience (used like `db.Int` in code)
  Int: sql.Int,
  VarChar: sql.VarChar,
  NVarChar: sql.NVarChar,
  DateTime: sql.DateTime,
  Bit: sql.Bit
};