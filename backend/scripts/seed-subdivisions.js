/**
 * Seed Subdivisions for Testing
 */
require('dotenv').config();
const { connectToDatabase, closeConnection, getConnection, sql } = require('../src/config/database');

async function seedSubdivisions() {
  try {
    console.log('🌱 Seeding subdivisions...\n');
    
    await connectToDatabase();
    const pool = getConnection();
    
    // Get all agencies
    const agenciesResult = await pool.request().query('SELECT Agency_ID, Agency_CD, Agency_Name FROM Agencies WHERE Is_Active = 1');
    const agencies = agenciesResult.recordset;
    
    console.log(`Found ${agencies.length} agencies\n`);
    
    for (const agency of agencies) {
      console.log(`Processing agency: ${agency.Agency_CD} - ${agency.Agency_Name}`);
      
      // Check if agency already has subdivisions
      const subdivisionCheck = await pool.request()
        .input('agencyId', sql.Int, agency.Agency_ID)
        .query('SELECT COUNT(*) as count FROM Subdivisions WHERE Agency_ID = @agencyId');
      
      if (subdivisionCheck.recordset[0].count > 0) {
        console.log(`  ✓ Already has ${subdivisionCheck.recordset[0].count} subdivision(s)\n`);
        continue;
      }
      
      // Create default subdivisions for this agency
      const subdivisions = [
        {
          code: `${agency.Agency_CD}-MAIN`,
          name: `${agency.Agency_Name} Main Line`,
          region: 'Main'
        },
        {
          code: `${agency.Agency_CD}-YARD`,
          name: `${agency.Agency_Name} Yard`,
          region: 'Yard'
        }
      ];
      
      for (const sub of subdivisions) {
        const result = await pool.request()
          .input('agencyId', sql.Int, agency.Agency_ID)
          .input('code', sql.NVarChar, sub.code.substring(0, 20)) // Limit to 20 chars
          .input('name', sql.NVarChar, sub.name.substring(0, 100))
          .input('region', sql.NVarChar, sub.region)
          .query(`
            INSERT INTO Subdivisions (Agency_ID, Subdivision_Code, Subdivision_Name, Region)
            OUTPUT INSERTED.*
            VALUES (@agencyId, @code, @name, @region)
          `);
        
        const created = result.recordset[0];
        console.log(`  ✓ Created: ${created.Subdivision_Code} (ID: ${created.Subdivision_ID})`);
      }
      console.log('');
    }
    
    // Show final count
    const totalResult = await pool.request().query('SELECT COUNT(*) as total FROM Subdivisions');
    console.log(`\n✅ Total subdivisions in database: ${totalResult.recordset[0].total}`);
    
    await closeConnection();
    console.log('\n🎉 Subdivision seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding subdivisions:', error);
    process.exit(1);
  }
}

seedSubdivisions();
