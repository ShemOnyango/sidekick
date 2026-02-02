const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { sql, connectToDatabase, closeConnection } = require('../src/config/database');

const runMigrations = async () => {
  try {
    console.log('🔧 Running database migrations...');
    
    const pool = await connectToDatabase();
    if (!pool) {
      console.error('Unable to connect to database; aborting migrations');
      process.exit(1);
    }
    
    // Get all migration files
    const migrationDir = path.join(__dirname, '../sql/migrations');
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Create migration tracking table if it doesn't exist
    const createMigrationTable = `
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SchemaMigrations')
      BEGIN
        CREATE TABLE SchemaMigrations (
          MigrationId NVARCHAR(255) PRIMARY KEY,
          AppliedAt DATETIME DEFAULT GETDATE()
        )
      END
    `;
    
    await pool.request().query(createMigrationTable);
    
    // Run each migration
    for (const file of migrationFiles) {
      const migrationId = file;
      
      // Check if migration already applied
      const checkQuery = `SELECT 1 FROM SchemaMigrations WHERE MigrationId = @migrationId`;
      const result = await pool.request()
        .input('migrationId', sql.NVarChar, migrationId)
        .query(checkQuery);
      
      if (result.recordset.length === 0) {
        console.log(`Applying migration: ${file}`);
        
        const migrationPath = path.join(migrationDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Split by GO statements (SQL Server batch separator).
        // Use a robust regex that matches a line containing only GO (case-insensitive), handling CRLF/LF.
        const statements = migrationSQL
          .split(/^\s*GO\s*$/gim)
          .map(s => s.trim())
          .filter(Boolean);

        for (const [idx, statement] of statements.entries()) {
          try {
            console.log(`Executing statement ${idx + 1}/${statements.length} for ${file}`);
            await pool.request().query(statement);
          } catch (err) {
            console.error(`Migration failed in file ${file} at statement ${idx + 1}:`, err);
            throw err;
          }
        }
        
        // Record migration
        const insertQuery = `INSERT INTO SchemaMigrations (MigrationId) VALUES (@migrationId)`;
        await pool.request()
          .input('migrationId', sql.NVarChar, migrationId)
          .query(insertQuery);
        
        console.log(`✅ Applied: ${file}`);
      } else {
        console.log(`⏭️  Skipped (already applied): ${file}`);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;