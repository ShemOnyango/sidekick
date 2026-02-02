require('dotenv').config();
const { connectToDatabase, closeConnection } = require('../src/config/database');
const agencyModel = require('../src/models/Agency');
const userModel = require('../src/models/User');
const jwt = require('jsonwebtoken');

async function run() {
  try {
    await connectToDatabase();

    // Create or find a dev agency
    let agency = await agencyModel.findByCode('DEV');
    if (!agency) {
      agency = await agencyModel.create({
        agencyCD: 'DEV',
        agencyName: 'Development Agency',
        region: 'Dev',
        contactEmail: 'dev@example.com',
        contactPhone: '000-000-0000'
      });
      console.log('Created agency:', agency.Agency_ID || agency.Agency_ID);
    } else {
      console.log('Found existing agency:', agency.Agency_ID);
    }

    // Create a test user
    const username = 'dev.user';
    const existing = await userModel.findByUsername(username);
    let user;
    if (!existing) {
      user = await userModel.create({
        agencyId: agency.Agency_ID || agency.agencyId || agency.Agency_ID,
        username,
        password: 'Password123!',
        employeeName: 'Dev User',
        employeeContact: '000-000-0000',
        email: 'dev.user@example.com',
        role: 'Supervisor'
      });
      console.log('Created user:', user.User_ID || user.userId || JSON.stringify(user));
    } else {
      user = existing;
      console.log('Found existing user:', user.User_ID || user.userId);
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.User_ID || user.userId || user.User_ID, agencyId: agency.Agency_ID || agency.agencyId }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRE || '7d' });

    console.log('\n==== TEST JWT ====>');
    console.log(token);
    console.log('==== END JWT ====>\n');

    await closeConnection();
    process.exit(0);
  } catch (err) {
    console.error('Error creating test user:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
