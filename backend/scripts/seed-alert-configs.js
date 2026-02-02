const sql = require('mssql');

// Database configuration
const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Herzog2024!',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'HerzogRailAuthority',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function seedAlertConfigs() {
  let pool;
  
  try {
    console.log('Seeding alert configurations...\n');
    
    pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server successfully');

    // Default alert configurations for agency 1 (DEFAULT)
    const alertConfigs = [
      // Proximity Alerts
      {
        agencyId: 1,
        configType: 'Proximity_Alert',
        alertLevel: 'Informational',
        distanceMiles: 1.0,
        messageTemplate: 'Worker detected within 1 mile',
        isActive: true
      },
      {
        agencyId: 1,
        configType: 'Proximity_Alert',
        alertLevel: 'Warning',
        distanceMiles: 0.5,
        messageTemplate: 'Worker detected within 0.5 miles - exercise caution',
        isActive: true
      },
      {
        agencyId: 1,
        configType: 'Proximity_Alert',
        alertLevel: 'Critical',
        distanceMiles: 0.25,
        messageTemplate: 'CRITICAL: Worker detected within 0.25 miles - immediate action required',
        isActive: true
      },
      // Boundary Alerts
      {
        agencyId: 1,
        configType: 'Boundary_Alert',
        alertLevel: 'Informational',
        distanceMiles: 1.0,
        messageTemplate: 'Approaching authority boundary (1 mile)',
        isActive: true
      },
      {
        agencyId: 1,
        configType: 'Boundary_Alert',
        alertLevel: 'Warning',
        distanceMiles: 0.5,
        messageTemplate: 'WARNING: Approaching authority boundary (0.5 miles)',
        isActive: true
      },
      {
        agencyId: 1,
        configType: 'Boundary_Alert',
        alertLevel: 'Critical',
        distanceMiles: 0.25,
        messageTemplate: 'CRITICAL: Authority boundary exit imminent (0.25 miles)',
        isActive: true
      },
      // Overlap Alerts
      {
        agencyId: 1,
        configType: 'Overlap_Alert',
        alertLevel: 'Warning',
        distanceMiles: 0,
        messageTemplate: 'Authority overlap detected',
        isActive: true
      },
      {
        agencyId: 1,
        configType: 'Overlap_Alert',
        alertLevel: 'Critical',
        distanceMiles: 0,
        messageTemplate: 'CRITICAL: Severe authority overlap detected - immediate coordination required',
        isActive: true
      }
    ];

    let created = 0;
    for (const config of alertConfigs) {
      await pool.request()
        .input('agencyId', sql.Int, config.agencyId)
        .input('configType', sql.NVarChar, config.configType)
        .input('alertLevel', sql.NVarChar, config.alertLevel)
        .input('distanceMiles', sql.Decimal(5, 2), config.distanceMiles)
        .input('messageTemplate', sql.NVarChar, config.messageTemplate)
        .input('isActive', sql.Bit, config.isActive ? 1 : 0)
        .query(`
          INSERT INTO Alert_Configurations (
            Agency_ID, Config_Type, Alert_Level, Distance_Miles,
            Message_Template, Is_Active
          )
          VALUES (
            @agencyId, @configType, @alertLevel, @distanceMiles,
            @messageTemplate, @isActive
          )
        `);
      created++;
    }

    console.log(`\n✅ Created ${created} alert configurations`);
    console.log('\n📊 Alert Configuration Summary:');
    console.log('   Proximity Alerts: 3 (0.25mi, 0.5mi, 1.0mi)');
    console.log('   Boundary Alerts: 3 (0.25mi, 0.5mi, 1.0mi)');
    console.log('   Overlap Alerts: 2 (Warning, Critical)');

  } catch (error) {
    console.error('❌ Error seeding alert configurations:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
    console.log('\n✅ Done!');
  }
}

seedAlertConfigs();
