/**
 * Seed Subdivisions for Metro Link
 */
require('dotenv').config();
const { connectToDatabase, closeConnection, getConnection, sql } = require('../src/config/database');

async function seedSubdivisions() {
  try {
    console.log('🌱 Seeding Metro Link subdivisions...\n');
    
    await connectToDatabase();
    const pool = getConnection();
    
    // Get METRLK agency (or create if doesn't exist)
    let agency = await pool.request()
      .query("SELECT Agency_ID, Agency_CD FROM Agencies WHERE Agency_CD = 'METRLK'");
    
    if (agency.recordset.length === 0) {
      console.log('Creating METRLK agency...');
      await pool.request()
        .query(`
          INSERT INTO Agencies (Agency_CD, Agency_Name, Contact_Email, Contact_Phone, Is_Active)
          VALUES ('METRLK', 'Metro Link Rail Authority', 'info@metrolinktrains.com', '800-371-5465', 1)
        `);
      
      agency = await pool.request()
        .query("SELECT Agency_ID, Agency_CD FROM Agencies WHERE Agency_CD = 'METRLK'");
      console.log('✓ METRLK agency created\n');
    }
    
    const agencyId = agency.recordset[0].Agency_ID;
    console.log(`Using agency: METRLK (ID: ${agencyId})\n`);
    
    // Metro Link subdivisions from Excel data
    const subdivisions = [
      {
        code: 'VENTURA',
        name: 'Ventura County Line',
        region: 'Southern California'
      },
      {
        code: 'MONTALVO',
        name: 'Montalvo Line', 
        region: 'Southern California'
      }
    ];
    
    for (const sub of subdivisions) {
      // Check if subdivision already exists
      const existing = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .input('code', sql.NVarChar, sub.code)
        .query('SELECT Subdivision_ID FROM Subdivisions WHERE Agency_ID = @agencyId AND Subdivision_Code = @code');
      
      if (existing.recordset.length > 0) {
        console.log(`  ✓ ${sub.code} already exists (ID: ${existing.recordset[0].Subdivision_ID})`);
        continue;
      }
      
      const result = await pool.request()
        .input('agencyId', sql.Int, agencyId)
        .input('code', sql.NVarChar, sub.code)
        .input('name', sql.NVarChar, sub.name)
        .input('region', sql.NVarChar, sub.region || '')
        .query(`
          INSERT INTO Subdivisions (Agency_ID, Subdivision_Code, Subdivision_Name, Region, Is_Active, Created_Date, Updated_Date)
          OUTPUT INSERTED.*
          VALUES (@agencyId, @code, @name, @region, 1, GETDATE(), GETDATE())
        `);
      
      const created = result.recordset[0];
      console.log(`  ✓ Created: ${created.Subdivision_Code} - ${created.Subdivision_Name} (ID: ${created.Subdivision_ID})`);
    }
    
    // Show all subdivisions for METRLK
    const allSubs = await pool.request()
      .input('agencyId', sql.Int, agencyId)
      .query('SELECT Subdivision_ID, Subdivision_Code, Subdivision_Name FROM Subdivisions WHERE Agency_ID = @agencyId');
    
    console.log(`\n✅ Total METRLK subdivisions: ${allSubs.recordset.length}`);
    allSubs.recordset.forEach(s => {
      console.log(`   - ${s.Subdivision_Code}: ${s.Subdivision_Name} (ID: ${s.Subdivision_ID})`);
    });
    
    await closeConnection();
    console.log('\n🎉 Subdivision seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding subdivisions:', error);
    process.exit(1);
  }
}

seedSubdivisions();
