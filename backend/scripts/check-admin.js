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

async function checkAdminUser() {
  try {
    await sql.connect(config);
    const result = await sql.query`
      SELECT User_ID, Username, Email, Role, Agency_ID, Is_Active 
      FROM Users 
      WHERE Username = 'admin'
    `;
    console.log('Admin User Details:');
    console.log(JSON.stringify(result.recordset, null, 2));
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkAdminUser();
