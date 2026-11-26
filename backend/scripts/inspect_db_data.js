const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const {
  sequelize,
  User,
  Department,
  Employee,
  Task,
  TaskAssignment,
  TaskComment,
  TaskActivityLog,
  TaskAttachment,
  Notification
} = require('../models');

async function inspect() {
  try {
    const userCount = await User.count();
    const employeeCount = await Employee.count();
    const departmentCount = await Department.count();
    const taskCount = await Task.count();
    const commentCount = await TaskComment.count();
    const activityCount = await TaskActivityLog.count();
    const attachmentCount = await TaskAttachment.count();
    const notificationCount = await Notification.count();

    console.log('=== DATABASE INVENTORY ===');
    console.log(`Users: ${userCount}`);
    console.log(`Employees: ${employeeCount}`);
    console.log(`Departments: ${departmentCount}`);
    console.log(`Tasks: ${taskCount}`);
    console.log(`Comments: ${commentCount}`);
    console.log(`Activity Logs: ${activityCount}`);
    console.log(`Attachments: ${attachmentCount}`);
    console.log(`Notifications: ${notificationCount}`);

    console.log('\n--- USERS ---');
    const users = await User.findAll({
      attributes: ['id', 'email', 'role', 'is_active', 'created_at'],
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'designation'] }],
      order: [['id', 'ASC']]
    });
    users.forEach((u) => {
      const empName = u.employee ? `${u.employee.first_name} ${u.employee.last_name} (${u.employee.designation})` : 'No Employee Profile';
      console.log(`[${u.id}] ${u.email} | Role: ${u.role} | Emp: ${empName}`);
    });

    console.log('\n--- DEPARTMENTS ---');
    const depts = await Department.findAll({ attributes: ['id', 'name'] });
    depts.forEach(d => console.log(`[${d.id}] ${d.name}`));

    console.log('\n--- TASKS (sample up to 10) ---');
    const sampleTasks = await Task.findAll({
      attributes: ['id', 'title', 'status', 'created_at'],
      limit: 10,
      order: [['id', 'ASC']]
    });
    sampleTasks.forEach(t => console.log(`[${t.id}] ${t.title} (${t.status})`));

    process.exit(0);
  } catch (err) {
    console.error('Inspection error:', err);
    process.exit(1);
  }
}

inspect();
