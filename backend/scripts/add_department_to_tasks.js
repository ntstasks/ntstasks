const { sequelize } = require('../models');
const { DataTypes } = require('sequelize');

async function migrate() {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('tasks');

  if (!table.department_id) {
    await qi.addColumn('tasks', 'department_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
    console.log('Successfully added department_id column to tasks table.');
  } else {
    console.log('department_id column already exists.');
  }

  // Backfill existing tasks with department from assigned employee or default
  await sequelize.query(`
    UPDATE tasks
    SET department_id = (
      SELECT e.department_id
      FROM task_assignments ta
      JOIN employees e ON ta.employee_id = e.id
      WHERE ta.task_id = tasks.id AND e.department_id IS NOT NULL
      LIMIT 1
    )
    WHERE department_id IS NULL;
  `);

  // If any task still doesn't have a department, assign the first available department
  await sequelize.query(`
    UPDATE tasks
    SET department_id = (SELECT id FROM departments ORDER BY id ASC LIMIT 1)
    WHERE department_id IS NULL;
  `);

  console.log('Successfully backfilled tasks department_id.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
