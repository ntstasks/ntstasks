const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function migrateDepartmentToText() {
  const qi = sequelize.getQueryInterface();

  try {
    // 1. Check employees table
    const empTable = await qi.describeTable('employees');
    if (!empTable.department) {
      console.log('Adding "department" VARCHAR column to employees table...');
      await qi.addColumn('employees', 'department', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      console.log('Added "department" column to employees table.');
    } else {
      console.log('"department" column already exists on employees table.');
    }

    // 2. Backfill existing employees from departments table
    console.log('Migrating department data from departments table into employees.department...');
    try {
      await sequelize.query(`
        UPDATE employees e
        SET department = d.name
        FROM departments d
        WHERE e.department_id = d.id AND (e.department IS NULL OR e.department = '');
      `);
    } catch (e) {
      console.warn('Direct join update notice:', e.message);
      await sequelize.query(`
        UPDATE employees
        SET department = (SELECT name FROM departments WHERE departments.id = employees.department_id)
        WHERE department_id IS NOT NULL AND (department IS NULL OR department = '');
      `);
    }

    // Default any remaining NULL departments to 'General'
    await sequelize.query(`
      UPDATE employees
      SET department = 'General'
      WHERE department IS NULL OR department = '';
    `);
    console.log('Successfully backfilled employees.department.');

    // 3. Check tasks table (add department text column too for consistency)
    const taskTable = await qi.describeTable('tasks');
    if (!taskTable.department) {
      console.log('Adding "department" VARCHAR column to tasks table...');
      await qi.addColumn('tasks', 'department', {
        type: DataTypes.STRING(255),
        allowNull: true
      });
      console.log('Added "department" column to tasks table.');
    }

    try {
      await sequelize.query(`
        UPDATE tasks t
        SET department = d.name
        FROM departments d
        WHERE t.department_id = d.id AND (t.department IS NULL OR t.department = '');
      `);
    } catch (e) {
      await sequelize.query(`
        UPDATE tasks
        SET department = (SELECT name FROM departments WHERE departments.id = tasks.department_id)
        WHERE department_id IS NOT NULL AND (department IS NULL OR department = '');
      `);
    }

    await sequelize.query(`
      UPDATE tasks
      SET department = 'General'
      WHERE department IS NULL OR department = '';
    `);
    console.log('Successfully backfilled tasks.department.');

    console.log('Migration completed successfully with zero data loss!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateDepartmentToText()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateDepartmentToText;
