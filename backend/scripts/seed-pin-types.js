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

async function seedPinTypes() {
  let pool;
  
  try {
    console.log('Seeding pin types...\n');
    
    pool = await sql.connect(sqlConfig);
    console.log('Connected to SQL Server successfully');

    // Default pin types for agency 1 (DEFAULT)
    const pinTypes = [
      // Safety pins
      {
        agencyId: 1,
        category: 'Safety',
        subtype: 'Hazard',
        color: '#FF0000',
        iconUrl: null,
        isActive: true,
        sortOrder: 1
      },
      {
        agencyId: 1,
        category: 'Safety',
        subtype: 'Warning',
        color: '#FFA500',
        iconUrl: null,
        isActive: true,
        sortOrder: 2
      },
      {
        agencyId: 1,
        category: 'Safety',
        subtype: 'Caution',
        color: '#FFFF00',
        iconUrl: null,
        isActive: true,
        sortOrder: 3
      },
      // Infrastructure pins
      {
        agencyId: 1,
        category: 'Infrastructure',
        subtype: 'Track Damage',
        color: '#8B0000',
        iconUrl: null,
        isActive: true,
        sortOrder: 4
      },
      {
        agencyId: 1,
        category: 'Infrastructure',
        subtype: 'Signal Issue',
        color: '#FF4500',
        iconUrl: null,
        isActive: true,
        sortOrder: 5
      },
      {
        agencyId: 1,
        category: 'Infrastructure',
        subtype: 'Switch Problem',
        color: '#FF6347',
        iconUrl: null,
        isActive: true,
        sortOrder: 6
      },
      // Maintenance pins
      {
        agencyId: 1,
        category: 'Maintenance',
        subtype: 'Repair Needed',
        color: '#4169E1',
        iconUrl: null,
        isActive: true,
        sortOrder: 7
      },
      {
        agencyId: 1,
        category: 'Maintenance',
        subtype: 'Inspection Required',
        color: '#1E90FF',
        iconUrl: null,
        isActive: true,
        sortOrder: 8
      },
      {
        agencyId: 1,
        category: 'Maintenance',
        subtype: 'Work Complete',
        color: '#00CED1',
        iconUrl: null,
        isActive: true,
        sortOrder: 9
      },
      // Information pins
      {
        agencyId: 1,
        category: 'Information',
        subtype: 'Note',
        color: '#32CD32',
        iconUrl: null,
        isActive: true,
        sortOrder: 10
      },
      {
        agencyId: 1,
        category: 'Information',
        subtype: 'Landmark',
        color: '#00FF00',
        iconUrl: null,
        isActive: true,
        sortOrder: 11
      },
      {
        agencyId: 1,
        category: 'Information',
        subtype: 'Reference Point',
        color: '#7FFF00',
        iconUrl: null,
        isActive: true,
        sortOrder: 12
      }
    ];

    let created = 0;
    for (const pinType of pinTypes) {
      await pool.request()
        .input('agencyId', sql.Int, pinType.agencyId)
        .input('category', sql.NVarChar, pinType.category)
        .input('subtype', sql.NVarChar, pinType.subtype)
        .input('color', sql.NVarChar, pinType.color)
        .input('iconUrl', sql.NVarChar, pinType.iconUrl)
        .input('isActive', sql.Bit, pinType.isActive ? 1 : 0)
        .input('sortOrder', sql.Int, pinType.sortOrder)
        .query(`
          INSERT INTO Pin_Types (
            Agency_ID, Pin_Category, Pin_Subtype, Color,
            Icon_URL, Is_Active, Sort_Order
          )
          VALUES (
            @agencyId, @category, @subtype, @color,
            @iconUrl, @isActive, @sortOrder
          )
        `);
      created++;
    }

    console.log(`\n✅ Created ${created} pin types`);
    console.log('\n📊 Pin Type Summary:');
    console.log('   Safety: 3 types (Hazard, Warning, Caution)');
    console.log('   Infrastructure: 3 types (Track Damage, Signal Issue, Switch Problem)');
    console.log('   Maintenance: 3 types (Repair Needed, Inspection Required, Work Complete)');
    console.log('   Information: 3 types (Note, Landmark, Reference Point)');

  } catch (error) {
    console.error('❌ Error seeding pin types:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
    console.log('\n✅ Done!');
  }
}

seedPinTypes();
