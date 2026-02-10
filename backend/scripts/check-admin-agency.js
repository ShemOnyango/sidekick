require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

sql.connect(config).then(async (pool) => {
  const userResult = await pool.request().query("SELECT User_ID, Username, Agency_ID FROM Users WHERE Username = 'admin'");
  console.log('Admin user:', userResult.recordset[0]);
  
  if (userResult.recordset[0]) {
    const agencyResult = await pool.request().query(`SELECT Agency_ID, Agency_Name, Agency_CD FROM Agencies WHERE Agency_ID = ${userResult.recordset[0].Agency_ID}`);
    console.log('Agency:', agencyResult.recordset[0]);
  }
  
  const alertsResult = await pool.request().query("SELECT COUNT(*) as total FROM Alert_Logs");
  console.log('Total alerts in DB:', alertsResult.recordset[0].total);
  
  const alertsByAgency = await pool.request().query(`
    SELECT u.Agency_ID, a.Agency_CD, COUNT(*) as alert_count
    FROM Alert_Logs al
    INNER JOIN Users u ON al.User_ID = u.User_ID
    INNER JOIN Agencies a ON u.Agency_ID = a.Agency_ID
    GROUP BY u.Agency_ID, a.Agency_CD
  `);
  console.log('Alerts by agency:', alertsByAgency.recordset);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
