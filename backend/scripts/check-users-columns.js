const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'HerzogRailAuthority',
  user: 'sa',
  password: 'YourStrong!Passw0rd',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkUsersTable() {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users'
      ORDER BY ORDINAL_POSITION
    `;
    console.log('Users Table Columns:');
    result.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkUsersTable();
