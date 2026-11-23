const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const {
  sequelize,
  User,
  Department,
  Employee
} = require('../models');

async function seedAdmin() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connected.');

    // 1. Create Default Departments
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
    console.log(`Created ${departmentsData.length} standard departments.`);

    // 2. Create Administrator Account
    let adminUser = await User.findOne({ where: { email: 'admin@nts.com' } });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@nts.com',
        password: 'Password123!',
        role: 'admin',
        is_active: true
      });
      console.log('Created admin user: admin@nts.com');
    }

    let adminEmployee = await Employee.findOne({ where: { user_id: adminUser.id } });
    if (!adminEmployee) {
      adminEmployee = await Employee.create({
        user_id: adminUser.id,
        employee_id: 'EMP-1001',
        first_name: 'System',
        last_name: 'Administrator',
        phone: '+1 555-0100',
        designation: 'Chief Operations Officer',
        department_id: deptMap['Management'] ? deptMap['Management'].id : null,
        joining_date: new Date()
      });
      console.log('Created admin employee profile: EMP-1001');
    }

    console.log('\nAdmin setup complete!');
    console.log('Email: admin@nts.com');
    console.log('Password: Password123!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin:', err);
    process.exit(1);
  }
}

seedAdmin();
