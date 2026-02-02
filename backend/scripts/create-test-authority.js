/**
 * Create a test authority for frontend testing
 */
require('dotenv').config();
const { connectToDatabase, closeConnection } = require('../src/config/database');
const Authority = require('../src/models/Authority');

async function createTestAuthority() {
  try {
    console.log('Creating test authority...\n');
    
    await connectToDatabase();
    
    // Create authority with admin user (ID 2) and DEFAULT-MAIN subdivision (ID 1)
    const authorityData = {
      userId: 2, // admin user
      authorityType: 'Track_Authority',
      subdivisionId: 1, // DEFAULT-MAIN
      beginMP: 50.0,
      endMP: 75.5,
      trackType: 'Main',
      trackNumber: '1',
      employeeNameDisplay: 'System Administrator',
      employeeContactDisplay: '555-1234',
      expirationTime: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours from now
    };
    
    const result = await Authority.create(authorityData);
    
    console.log('✅ Test authority created successfully!');
    console.log(`   Authority ID: ${result.authorityId}`);
    console.log(`   Type: ${result.authority.Authority_Type}`);
    console.log(`   Range: MP ${result.authority.Begin_MP} - ${result.authority.End_MP}`);
    console.log(`   Track: ${result.authority.Track_Type} ${result.authority.Track_Number}`);
    console.log(`   Subdivision: ${result.authority.Subdivision_Code}`);
    
    if (result.hasOverlap) {
      console.log(`\n⚠️  Overlaps detected: ${result.overlapDetails.length}`);
    }
    
    await closeConnection();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error creating test authority:', error);
    process.exit(1);
  }
}

createTestAuthority();
