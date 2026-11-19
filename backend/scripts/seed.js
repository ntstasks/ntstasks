const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const {
  sequelize,
  User,
  Department,
  Employee,
  TaskCategory,
  Task,
  TaskAssignment,
  TaskComment,
  TaskActivityLog,
  TaskStatusHistory,
  Notification
} = require('../models');

async function seed() {
  try {
    console.log('Synchronizing database schema...');
    await sequelize.sync();
    console.log('Database synced.');

    // 1. Seed Departments
    const departmentsData = [
      { name: 'Management', description: 'Executive and organizational leadership' },
      { name: 'Engineering', description: 'Core application, infrastructure and DevOps engineering' },
      { name: 'Design', description: 'User experience, product interface, and branding' },
      { name: 'Marketing', description: 'Brand expansion, growth analytics, and content marketing' },
      { name: 'Operations & HR', description: 'People operations, recruitment, and logistics' },
      { name: 'Quality Assurance', description: 'Test automation, release validation, and compliance' }
    ];

    const departmentMap = {};
    for (const d of departmentsData) {
      const [dept] = await Department.findOrCreate({
        where: { name: d.name },
        defaults: d
      });
      departmentMap[d.name] = dept;
    }
    console.log('Departments seeded.');

    // 2. Seed Categories
    const categoriesData = [
      { name: 'Development', color: '#2563EB' },
      { name: 'Design', color: '#7C3AED' },
      { name: 'Meeting', color: '#D97706' },
      { name: 'Research', color: '#059669' },
      { name: 'Support', color: '#DC2626' },
      { name: 'Documentation', color: '#4F46E5' },
      { name: 'Testing', color: '#0891B2' },
      { name: 'Planning', color: '#EA580C' }
    ];

    const categoryMap = {};
    for (const c of categoriesData) {
      const [cat] = await TaskCategory.findOrCreate({
        where: { name: c.name },
        defaults: c
      });
      categoryMap[c.name] = cat;
    }
    console.log('Categories seeded.');

    // 3. Seed Admin
    let adminUser = await User.findOne({ where: { email: 'admin@nts.com' } });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@nts.com',
        password: 'Password123!',
        role: 'admin',
        is_active: true
      });
      await Employee.create({
        user_id: adminUser.id,
        employee_id: 'EMP-001',
        first_name: 'System',
        last_name: 'Administrator',
        phone: '+1 555-0100',
        designation: 'Chief Operations Officer',
        department_id: departmentMap['Management'].id,
        joining_date: '2023-01-01',
        bio: 'Overall administrator and manager of NTS operations.'
      });
      console.log('Admin user created.');
    } else {
      console.log('Admin user already exists.');
    }

    // 4. Seed Employees
    const employeesData = [
      {
        email: 'alex.morgan@nts.com',
        empId: 'EMP-1002',
        first_name: 'Alex',
        last_name: 'Morgan',
        phone: '+1 555-0102',
        designation: 'Senior Frontend Engineer',
        department: 'Engineering',
        joining_date: '2024-03-15',
        bio: 'Focused on React performance, modern architecture and accessible UI systems.'
      },
      {
        email: 'sarah.chen@nts.com',
        empId: 'EMP-1003',
        first_name: 'Sarah',
        last_name: 'Chen',
        phone: '+1 555-0103',
        designation: 'Product Design Lead',
        department: 'Design',
        joining_date: '2023-08-01',
        bio: 'Lead designer focusing on sleek SaaS aesthetics and intuitive product workflows.'
      },
      {
        email: 'david.kumar@nts.com',
        empId: 'EMP-1004',
        first_name: 'David',
        last_name: 'Kumar',
        phone: '+1 555-0104',
        designation: 'DevOps & Cloud Architect',
        department: 'Engineering',
        joining_date: '2024-01-10',
        bio: 'Infrastructure, CI/CD pipelines, Kubernetes, and PostgreSQL high availability.'
      },
      {
        email: 'emily.watson@nts.com',
        empId: 'EMP-1005',
        first_name: 'Emily',
        last_name: 'Watson',
        phone: '+1 555-0105',
        designation: 'Growth Marketing Specialist',
        department: 'Marketing',
        joining_date: '2024-06-20',
        bio: 'Growth campaigns, user engagement tracking and digital content strategy.'
      },
      {
        email: 'michael.brown@nts.com',
        empId: 'EMP-1006',
        first_name: 'Michael',
        last_name: 'Brown',
        phone: '+1 555-0106',
        designation: 'QA Automation Lead',
        department: 'Quality Assurance',
        joining_date: '2024-04-12',
        bio: 'End-to-end automated testing, load testing and security compliance audits.'
      }
    ];

    const seededEmployees = [];
    for (const emp of employeesData) {
      let user = await User.findOne({ where: { email: emp.email } });
      let employee;
      if (!user) {
        user = await User.create({
          email: emp.email,
          password: 'Password123!',
          role: 'employee',
          is_active: true
        });
        employee = await Employee.create({
          user_id: user.id,
          employee_id: emp.empId,
          first_name: emp.first_name,
          last_name: emp.last_name,
          phone: emp.phone,
          designation: emp.designation,
          department_id: departmentMap[emp.department].id,
          joining_date: emp.joining_date,
          bio: emp.bio
        });
        console.log(`Created employee: ${emp.first_name} ${emp.last_name}`);
      } else {
        employee = await Employee.findOne({ where: { user_id: user.id } });
      }
      seededEmployees.push({ user, employee });
    }

    // 5. Check if tasks exist, if not seed initial realistic tasks
    const existingTaskCount = await Task.count();
    if (existingTaskCount === 0) {
      console.log('Seeding initial realistic tasks...');

      const alex = seededEmployees.find(e => e.employee.employee_id === 'EMP-1002');
      const sarah = seededEmployees.find(e => e.employee.employee_id === 'EMP-1003');
      const david = seededEmployees.find(e => e.employee.employee_id === 'EMP-1004');
      const emily = seededEmployees.find(e => e.employee.employee_id === 'EMP-1005');
      const michael = seededEmployees.find(e => e.employee.employee_id === 'EMP-1006');

      const initialTasks = [
        // Alex Tasks
        {
          title: 'Implement Recharts Analytics Dashboard',
          description: 'Build interactive chart components for task status distribution and productivity trends.',
          category_id: categoryMap['Development'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-01',
          due_date: '2026-11-15',
          priority: 'high',
          status: 'in_progress',
          progress: 80,
          estimated_hours: 24,
          actual_hours: 19.5,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [alex.employee.id]
        },
        {
          title: 'Optimize Responsive Navigation & Sidebar',
          description: 'Refactor drawer collapse, active state styling, and mobile responsiveness.',
          category_id: categoryMap['Development'].id,
          creator_id: alex.user.id,
          assigned_by: alex.user.id,
          start_date: '2026-11-03',
          due_date: '2026-11-10',
          completed_date: '2026-11-09T16:30:00Z',
          priority: 'medium',
          status: 'completed',
          progress: 100,
          estimated_hours: 12,
          actual_hours: 10,
          approval_status: 'approved',
          feedback: 'Great attention to detail and smooth micro-interactions!',
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [alex.employee.id]
        },
        {
          title: 'Client-side JWT Expiry and Auto Refresh',
          description: 'Handle automatic token renewal and intercept 401 unauthorized errors gracefully.',
          category_id: categoryMap['Development'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-16',
          due_date: '2026-11-22',
          priority: 'critical',
          status: 'not_started',
          progress: 0,
          estimated_hours: 16,
          actual_hours: 0,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [alex.employee.id]
        },
        // Sarah Tasks
        {
          title: 'Design System & Component Library Tokens',
          description: 'Establish standard typography scales, button hierarchies, and badge styles for corporate theme.',
          category_id: categoryMap['Design'].id,
          creator_id: sarah.user.id,
          assigned_by: sarah.user.id,
          start_date: '2026-11-01',
          due_date: '2026-11-08',
          completed_date: '2026-11-07T14:00:00Z',
          priority: 'high',
          status: 'completed',
          progress: 100,
          estimated_hours: 20,
          actual_hours: 18,
          approval_status: 'approved',
          feedback: 'Clean corporate color palette, approved for production.',
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [sarah.employee.id]
        },
        {
          title: 'Executive Analytics View High-Fidelity Wireframes',
          description: 'Prepare detailed UX flows for department comparisons and individual employee deep-dives.',
          category_id: categoryMap['Design'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-09',
          due_date: '2026-11-18',
          priority: 'high',
          status: 'in_progress',
          progress: 65,
          estimated_hours: 30,
          actual_hours: 20,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [sarah.employee.id]
        },
        // David Tasks
        {
          title: 'PostgreSQL Connection Pooling and Read Performance',
          description: 'Tune Sequelize connection pool parameters and verify latency under load.',
          category_id: categoryMap['Development'].id,
          creator_id: david.user.id,
          assigned_by: david.user.id,
          start_date: '2026-11-02',
          due_date: '2026-11-06',
          completed_date: '2026-11-05T18:00:00Z',
          priority: 'critical',
          status: 'completed',
          progress: 100,
          estimated_hours: 15,
          actual_hours: 14,
          approval_status: 'approved',
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [david.employee.id]
        },
        {
          title: 'Automated Daily Database Backup & S3 Archiving',
          description: 'Configure automated cron dump with encryption and retention policy.',
          category_id: categoryMap['Development'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-08',
          due_date: '2026-11-12', // Note: Past due date to demonstrate overdue recognition!
          priority: 'high',
          status: 'in_progress',
          progress: 40,
          estimated_hours: 18,
          actual_hours: 12,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [david.employee.id]
        },
        // Emily Tasks
        {
          title: 'Q4 Product Launch Content & Communication Schedule',
          description: 'Draft release notes, user walkthrough docs and corporate announcements.',
          category_id: categoryMap['Planning'].id,
          creator_id: emily.user.id,
          assigned_by: emily.user.id,
          start_date: '2026-11-05',
          due_date: '2026-11-20',
          priority: 'medium',
          status: 'in_progress',
          progress: 50,
          estimated_hours: 25,
          actual_hours: 13,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [emily.employee.id]
        },
        {
          title: 'Brand Asset Guidelines & Presentation Template',
          description: 'Standardize company presentations with correct logo aspect ratios and fonts.',
          category_id: categoryMap['Documentation'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-01',
          due_date: '2026-11-04',
          completed_date: '2026-11-04T12:00:00Z',
          priority: 'low',
          status: 'completed',
          progress: 100,
          estimated_hours: 10,
          actual_hours: 8,
          approval_status: 'approved',
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [emily.employee.id]
        },
        // Michael Tasks
        {
          title: 'End-to-End API Test Suite for Task Life Cycle',
          description: 'Automate REST endpoint test coverage including edge cases and role security checks.',
          category_id: categoryMap['Testing'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-11-06',
          due_date: '2026-11-17',
          priority: 'high',
          status: 'in_progress',
          progress: 70,
          estimated_hours: 28,
          actual_hours: 20,
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [michael.employee.id]
        },
        {
          title: 'Role-Based Access Control Penetration Audit',
          description: 'Verify employee accounts cannot escalate privileges or access unassigned private resources.',
          category_id: categoryMap['Testing'].id,
          creator_id: michael.user.id,
          assigned_by: michael.user.id,
          start_date: '2026-11-02',
          due_date: '2026-11-09',
          completed_date: '2026-11-08T15:00:00Z',
          priority: 'critical',
          status: 'completed',
          progress: 100,
          estimated_hours: 16,
          actual_hours: 15,
          approval_status: 'approved',
          feedback: 'Audit passed cleanly. Zero critical vulnerabilities found.',
          is_monthly_planned: true,
          planned_month: '2026-11',
          assignedTo: [michael.employee.id]
        },
        // Oct 2026 Previous Month Historical Tasks for Monthly Comparison
        {
          title: 'Sprint Planning & Backlog Grooming - October',
          description: 'Consolidated engineering roadmap and resource allocation for Q4 kickoff.',
          category_id: categoryMap['Planning'].id,
          creator_id: adminUser.id,
          assigned_by: adminUser.id,
          start_date: '2026-10-01',
          due_date: '2026-10-05',
          completed_date: '2026-10-04T17:00:00Z',
          priority: 'high',
          status: 'completed',
          progress: 100,
          estimated_hours: 20,
          actual_hours: 18,
          approval_status: 'approved',
          is_monthly_planned: true,
          planned_month: '2026-10',
          assignedTo: [alex.employee.id, david.employee.id]
        },
        {
          title: 'Enterprise Single Sign-On Architecture Discovery',
          description: 'Review SAML2 and OAuth2 providers for prospective enterprise tier accounts.',
          category_id: categoryMap['Research'].id,
          creator_id: david.user.id,
          assigned_by: david.user.id,
          start_date: '2026-10-12',
          due_date: '2026-10-25',
          completed_date: '2026-10-24T16:00:00Z',
          priority: 'medium',
          status: 'completed',
          progress: 100,
          estimated_hours: 25,
          actual_hours: 24,
          approval_status: 'approved',
          is_monthly_planned: true,
          planned_month: '2026-10',
          assignedTo: [david.employee.id]
        }
      ];

      for (const t of initialTasks) {
        const { assignedTo, ...taskFields } = t;
        const task = await Task.create(taskFields);
        if (assignedTo && assignedTo.length > 0) {
          for (const empId of assignedTo) {
            await TaskAssignment.create({
              task_id: task.id,
              employee_id: empId
            });
          }
        }

        // Add Activity Log
        await TaskActivityLog.create({
          task_id: task.id,
          user_id: task.creator_id,
          action: 'created',
          details: `Task "${task.title}" was created.`
        });

        // Add initial comment if completed
        if (task.status === 'completed') {
          await TaskComment.create({
            task_id: task.id,
            user_id: task.creator_id,
            comment: 'Task completed successfully and all requirements validated.'
          });

          await TaskStatusHistory.create({
            task_id: task.id,
            changed_by: task.creator_id,
            from_status: 'in_progress',
            to_status: 'completed',
            notes: 'Completed ahead of deadline.'
          });
        }
      }
      console.log('Sample tasks created successfully.');

      // Add sample notification for Alex
      await Notification.create({
        user_id: alex.user.id,
        sender_id: adminUser.id,
        title: 'New High Priority Task Assigned',
        message: 'Admin assigned "Implement Recharts Analytics Dashboard" to you.',
        type: 'task_assigned',
        is_read: false
      });
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
