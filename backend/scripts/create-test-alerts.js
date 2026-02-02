/**
 * Create test alerts for testing alert management
 */
require('dotenv').config();
const { connectToDatabase, closeConnection, getConnection, sql } = require('../src/config/database');

async function createTestAlerts() {
  try {
    console.log('Creating test alerts...\n');
    
    await connectToDatabase();
    const pool = getConnection();
    
    // Alert types and levels to create
    const alertTypes = ['Overlap_Detected', 'Proximity', 'Boundary_Exit', 'Boundary_Approach'];
    const alertLevels = ['Informational', 'Warning', 'Critical'];
    
    let created = 0;
    
    // Create 20 test alerts over the past week
    for (let i = 0; i < 20; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const alertLevel = alertLevels[Math.floor(Math.random() * alertLevels.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      const isRead = Math.random() > 0.5;
      const isDelivered = true;
      
      const alertMessage = generateAlertMessage(alertType, alertLevel);
      
      // Add distance for proximity and boundary alerts
      const hasDistance = (alertType === 'Proximity' || alertType.includes('Boundary'));
      const distance = hasDistance ? (Math.random() * 2).toFixed(2) : null;
      
      const request = pool.request()
        .input('userId', sql.Int, 2) // admin user
        .input('alertType', sql.NVarChar, alertType)
        .input('alertLevel', sql.NVarChar, alertLevel)
        .input('message', sql.NVarChar, alertMessage)
        .input('isRead', sql.Bit, isRead ? 1 : 0)
        .input('isDelivered', sql.Bit, isDelivered ? 1 : 0)
        .input('createdDate', sql.DateTime, new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000))
        .input('deliveredTime', sql.DateTime, new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 + 5000));
      
      if (hasDistance) {
        request.input('distance', sql.Decimal(5, 2), distance);
          
        await request.query(`
          INSERT INTO Alert_Logs (
            User_ID, Alert_Type, Alert_Level, Message,
            Is_Delivered, Delivered_Time, Is_Read, Created_Date,
            Triggered_Distance
          )
          VALUES (
            @userId, @alertType, @alertLevel, @message,
            @isDelivered, @deliveredTime, @isRead, @createdDate,
            @distance
          )
        `);
      } else {
        await request.query(`
          INSERT INTO Alert_Logs (
            User_ID, Alert_Type, Alert_Level, Message,
            Is_Delivered, Delivered_Time, Is_Read, Created_Date
          )
          VALUES (
            @userId, @alertType, @alertLevel, @message,
            @isDelivered, @deliveredTime, @isRead, @createdDate
          )
        `);
      }
      
      created++;
    }
    
    console.log(`✅ Created ${created} test alerts`);
    
    // Show summary
    const summary = await pool.request().query(`
      SELECT 
        Alert_Type,
        Alert_Level,
        COUNT(*) as Count
      FROM Alert_Logs
      WHERE User_ID = 2
      GROUP BY Alert_Type, Alert_Level
      ORDER BY Alert_Type, Alert_Level
    `);
    
    console.log('\n📊 Alert Summary:');
    summary.recordset.forEach(row => {
      console.log(`   ${row.Alert_Type} - ${row.Alert_Level}: ${row.Count}`);
    });
    
    await closeConnection();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error creating test alerts:', error);
    process.exit(1);
  }
}

function generateAlertMessage(alertType, alertLevel) {
  const messages = {
    Overlap_Detected: {
      Informational: 'Authority overlap detected: MP 50-75 overlaps with MP 52-72',
      Warning: 'Multiple authority overlaps detected on Main Track 1',
      Critical: 'CRITICAL: Major authority overlap requires immediate attention'
    },
    Proximity: {
      Informational: 'Worker approaching your work zone',
      Warning: 'Multiple workers detected within 0.5 miles',
      Critical: 'CRITICAL: Unauthorized personnel in restricted zone'
    },
    Boundary_Exit: {
      Informational: 'Worker exited authority boundary at MP 65.2',
      Warning: 'Worker has left designated work zone',
      Critical: 'CRITICAL: Worker exited safety zone - verify location'
    },
    Boundary_Approach: {
      Informational: 'Approaching authority boundary in 0.5 miles',
      Warning: 'Nearing authority boundary - use caution',
      Critical: 'CRITICAL: At authority boundary limit'
    }
  };
  
  return messages[alertType][alertLevel];
}

createTestAlerts();
