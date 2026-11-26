const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, User, Employee, Department } = require('../models');

async function setupDualAccount() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL.');

    const email = 'suchi@neuraltechsoft.com';
    const dept = await Department.findOne({ where: { name: 'Management' } }) || await Department.findOne();

    // 1. Create Administrator Account
    let adminUser = await User.findOne({ where: { email, role: 'admin' } });
    if (!adminUser) {
      adminUser = await User.create({
        email,
        password: 'nts@123',
        role: 'admin',
        is_active: true
      });
      console.log('Created Admin User:', adminUser.id, adminUser.email, adminUser.role);
    } else {
      adminUser.password = 'nts@123';
      await adminUser.save();
      console.log('Updated Admin User password.');
    }

    let adminEmp = await Employee.findOne({ where: { user_id: adminUser.id } });
    if (!adminEmp) {
      adminEmp = await Employee.create({
        user_id: adminUser.id,
        employee_id: 'ADM-1001',
        first_name: 'Suchi',
        last_name: 'Admin',
        designation: 'Chief Administrator',
        department_id: dept?.id || null,
        phone: '+91 9876543210',
        joining_date: new Date()
      });
      console.log('Created Admin Employee profile: ADM-1001');
    }

    // 2. Create Employee Account with the SAME email
    let empUser = await User.findOne({ where: { email, role: 'employee' } });
    if (!empUser) {
      empUser = await User.create({
        email,
        password: 'nts@123',
        role: 'employee',
        is_active: true
      });
      console.log('Created Employee User (Same Email!):', empUser.id, empUser.email, empUser.role);
    } else {
      empUser.password = 'nts@123';
      await empUser.save();
      console.log('Updated Employee User password.');
    }

    let empProfile = await Employee.findOne({ where: { user_id: empUser.id } });
    if (!empProfile) {
      empProfile = await Employee.create({
        user_id: empUser.id,
        employee_id: 'EMP-1002',
        first_name: 'Suchi',
        last_name: 'Team',
        designation: 'Team Member',
        department_id: dept?.id || null,
        phone: '+91 9876543210',
        joining_date: new Date()
      });
      console.log('Created Employee profile: EMP-1002');
    }

    console.log('\n=== DUAL ACCOUNT SETUP COMPLETE ===');
    console.log('Admin Account:');
    console.log(` - URL: http://localhost:5173/admin/login`);
    console.log(` - Email: suchi@neuraltechsoft (or suchi@neuraltechsoft.com)`);
    console.log(` - Password: nts@123`);
    console.log(` - Role: admin -> Leads to Admin Console & Full Management`);
    console.log('\nEmployee Account:');
    console.log(` - URL: http://localhost:5173/login`);
    console.log(` - Email: suchi@neuraltechsoft (or suchi@neuraltechsoft.com)`);
    console.log(` - Password: nts@123`);
    console.log(` - Role: employee -> Leads to Employee Task Workspace`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to setup dual account:', err);
    process.exit(1);
  }
}

setupDualAccount();
