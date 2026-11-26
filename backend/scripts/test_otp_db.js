const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, User, Employee } = require('../models');

async function testOtpDb() {
  const targetEmail = process.argv[2] ? process.argv[2].trim().toLowerCase() : null;

  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected.');

    if (targetEmail) {
      console.log(`\n--- Inspecting User: ${targetEmail} ---`);
      const user = await User.findOne({
        where: { email: targetEmail },
        include: [{ model: Employee, as: 'employee' }]
      });

      if (!user) {
        console.log(`❌ User not found with email: ${targetEmail}`);
      } else {
        console.log(`User ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Active: ${user.is_active}`);
        console.log(`Reset Token Hash: ${user.reset_token || '(none)'}`);
        console.log(`Reset Token Expiry: ${user.reset_token_expiry || '(none)'}`);
        if (user.reset_token_expiry) {
          const isExpired = new Date(user.reset_token_expiry) < new Date();
          console.log(`Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE & VALID'}`);
        }
      }
    } else {
      console.log('\n--- Recent Users with OTP/Reset Token ---');
      const users = await User.findAll({
        attributes: ['id', 'email', 'role', 'reset_token', 'reset_token_expiry', 'updated_at'],
        order: [['updated_at', 'DESC']],
        limit: 10
      });

      users.forEach((u) => {
        const hasToken = Boolean(u.reset_token);
        const isExpired = u.reset_token_expiry ? new Date(u.reset_token_expiry) < new Date() : true;
        const status = !hasToken ? 'No Token' : (isExpired ? 'Expired' : 'Active Token');
        console.log(`[${u.id}] ${u.email} (${u.role}) -> ${status} | Expiry: ${u.reset_token_expiry || 'N/A'}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Database inspection error:', err);
    process.exit(1);
  }
}

testOtpDb();
