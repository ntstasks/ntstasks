const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { sequelize, User, Employee, Department } = require('../models');

async function createSuchiAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL.');

    // 1. Ensure Standard Departments exist
    const departmentsData = [
      { name: 'Management', description: 'Executive and organizational leadership' },
      { name: 'Engineering', description: 'Core application, infrastructure and DevOps engineering' },
      { name: 'Design', description: 'User experience, product interface, and branding' },
      { name: 'Marketing', description: 'Brand expansion, growth analytics, and content marketing' },
      { name: 'Operations & HR', description: 'People operations, recruitment, and logistics' },
      { name: 'Quality Assurance', description: 'Test automation, release validation, and compliance' }
    ];

    const deptMap = {};
    for (const d of departmentsData) {
      const [dept] = await Department.findOrCreate({
        where: { name: d.name },
        defaults: d
      });
      deptMap[d.name] = dept;
    }
    console.log('Departments checked/created.');

    // 2. Create or Update suchi@neuraltechsoft.com
    const targetEmail = 'suchi@neuraltechsoft.com';
    let user = await User.findOne({ where: { email: targetEmail } });

    if (!user) {
      user = await User.create({
        email: targetEmail,
        password: 'nts@123',
        role: 'admin',
        is_active: true
      });
      console.log(`Created admin user: ${targetEmail}`);
    } else {
      user.password = 'nts@123';
      user.role = 'admin';
      user.is_active = true;
      await user.save();
      console.log(`Updated existing user to admin: ${targetEmail}`);
    }

    // 3. Create or Update Employee Profile
    let employee = await Employee.findOne({ where: { user_id: user.id } });
    if (!employee) {
      employee = await Employee.create({
        user_id: user.id,
        employee_id: 'EMP-1001',
        first_name: 'Suchi',
        last_name: 'Admin',
        phone: '+91 9876543210',
        designation: 'Chief Administrator',
        department_id: deptMap['Management'] ? deptMap['Management'].id : null,
        joining_date: new Date()
      });
      console.log('Created employee profile: Suchi Admin (EMP-1001)');
    } else {
      employee.first_name = 'Suchi';
      employee.last_name = 'Admin';
      employee.designation = 'Chief Administrator';
      employee.department_id = deptMap['Management'] ? deptMap['Management'].id : null;
      await employee.save();
      console.log('Updated employee profile.');
    }

    console.log('\n=== SUCCESS: ADMIN ACCOUNT READY ===');
    console.log(`Email: ${targetEmail} (or suchi@neuraltechsoft)`);
    console.log('Password: nts@123');
    console.log('Role: admin');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

createSuchiAdmin();
