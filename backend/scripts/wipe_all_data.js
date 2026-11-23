const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require('../models');

async function wipeAllData() {
  console.log('Connecting to PostgreSQL database...');
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    console.log('Wiping all test data and tables...');

    // Truncate all tables safely
    const tablesToTruncate = [
      'task_activity_logs',
      'task_comments',
      'task_attachments',
      'task_assignments',
      'task_status_history',
      'notifications',
      'tasks',
      'task_categories',
      'employees',
      'departments',
      'users'
    ];

    for (const table of tablesToTruncate) {
      try {
        await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
        console.log(` - Cleared table: ${table}`);
      } catch (tableErr) {
        // In case an optional table doesn't exist yet, continue
        console.log(` - Table ${table}: ${tableErr.message}`);
      }
    }

    console.log('\nAll test data has been completely wiped from the database.');
    console.log('All ID sequences reset to 1.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to wipe data:', error);
    process.exit(1);
  }
}

wipeAllData();
