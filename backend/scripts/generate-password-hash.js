/**
 * Generate bcrypt password hash
 * Usage: node scripts/generate-password-hash.js <password>
 * Example: node scripts/generate-password-hash.js admin123
 */

const bcrypt = require('bcryptjs');

async function generateHash() {
  // Get password from command line argument or use default
  const password = process.argv[2] || 'admin123';
  
  if (!password) {
    console.error('❌ Error: Please provide a password');
    console.log('Usage: node scripts/generate-password-hash.js <password>');
    process.exit(1);
  }

  try {
    console.log(`\n🔐 Generating bcrypt hash for password: "${password}"\n`);
    
    // Generate salt with 10 rounds (same as used in the system)
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    const hash = await bcrypt.hash(password, salt);
    
    console.log('✅ Hash generated successfully!\n');
    console.log('Password Hash:');
    console.log('─'.repeat(70));
    console.log(hash);
    console.log('─'.repeat(70));
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log(`\n✓ Verification: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n📝 SQL Update Statement:');
    console.log('─'.repeat(70));
    console.log(`UPDATE Users SET Password_Hash = '${hash}' WHERE Username = 'admin';`);
    console.log('─'.repeat(70));
    
  } catch (error) {
    console.error('❌ Error generating hash:', error.message);
    process.exit(1);
  }
}

// Run the script
generateHash();
