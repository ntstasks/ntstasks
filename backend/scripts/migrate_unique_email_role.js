const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize } = require('../models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    console.log('Checking current constraints on users table...');
    const [constraints] = await sequelize.query(`
      SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_email_key';
    `);

    if (constraints.length > 0) {
      console.log('Dropping constraint users_email_key...');
      await sequelize.query(`ALTER TABLE users DROP CONSTRAINT users_email_key;`);
      console.log('Dropped users_email_key.');
    }

    const [compositeConstraints] = await sequelize.query(`
      SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_email_role_unique';
    `);

    if (compositeConstraints.length === 0) {
      console.log('Adding composite unique constraint users_email_role_unique (email, role)...');
      await sequelize.query(`
        ALTER TABLE users ADD CONSTRAINT users_email_role_unique UNIQUE (email, role);
      `);
      console.log('Added composite constraint users_email_role_unique.');
    } else {
      console.log('users_email_role_unique already exists.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
