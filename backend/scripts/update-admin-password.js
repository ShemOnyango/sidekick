/**
 * Update admin password in database
 * Usage: node scripts/update-admin-password.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectToDatabase, closeConnection, getConnection } = require('../src/config/database');

async function updateAdminPassword() {
  try {
    console.log('\n🔐 Updating admin password...\n');
    
    // Connect to database
    await connectToDatabase();
    const pool = getConnection();
    
    // Generate hash for admin123
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('Generated password hash:', hash);
    console.log('');
    
    // Update admin user
    const result = await pool.request()
      .input('hash', hash)
      .query(`
        UPDATE Users 
        SET Password_Hash = @hash 
        WHERE Username = 'admin'
      `);
    
    console.log(`✅ Updated ${result.rowsAffected[0]} user(s)`);
    
    // Verify the update worked by checking password
    const userResult = await pool.request()
      .query('SELECT Username, Password_Hash FROM Users WHERE Username = \'admin\'');
    
    if (userResult.recordset.length > 0) {
      const user = userResult.recordset[0];
      const isValid = await bcrypt.compare(password, user.Password_Hash);
      
      console.log('\n✓ Verification:');
      console.log(`  - User: ${user.Username}`);
      console.log(`  - Password matches: ${isValid ? 'YES ✓' : 'NO ✗'}`);
      
      if (isValid) {
        console.log('\n🎉 Admin password successfully updated to: admin123\n');
      } else {
        console.error('\n❌ Error: Password verification failed!\n');
        process.exit(1);
      }
    } else {
      console.error('\n❌ Error: Admin user not found!\n');
      process.exit(1);
    }
    
    await closeConnection();
    
  } catch (error) {
    console.error('\n❌ Error updating password:', error.message);
    process.exit(1);
  }
}

// Run the script
updateAdminPassword();
