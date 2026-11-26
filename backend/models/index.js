const { sequelize } = require('../config/database');
const User = require('./User');
const Department = require('./Department');
const Employee = require('./Employee');
const TaskCategory = require('./TaskCategory');
const Task = require('./Task');
const TaskAssignment = require('./TaskAssignment');
const TaskActivityLog = require('./TaskActivityLog');

// User <-> Employee
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee', onDelete: 'CASCADE' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Department <-> Employee
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees', onDelete: 'SET NULL' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department_rel' });

// Department <-> Task
Department.hasMany(Task, { foreignKey: 'department_id', as: 'tasks', onDelete: 'SET NULL' });
Task.belongsTo(Department, { foreignKey: 'department_id', as: 'department_rel' });

// TaskCategory <-> Task
TaskCategory.hasMany(Task, { foreignKey: 'category_id', as: 'tasks', onDelete: 'SET NULL' });
Task.belongsTo(TaskCategory, { foreignKey: 'category_id', as: 'category' });

// User <-> Task (Creator)
User.hasMany(Task, { foreignKey: 'creator_id', as: 'created_tasks' });
Task.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });

// User <-> Task (Assigner)
User.hasMany(Task, { foreignKey: 'assigned_by', as: 'assigned_tasks' });
Task.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

// Task <-> Employee (ManyToMany through TaskAssignment)
Task.belongsToMany(Employee, { through: TaskAssignment, foreignKey: 'task_id', otherKey: 'employee_id', as: 'assigned_employees' });
Employee.belongsToMany(Task, { through: TaskAssignment, foreignKey: 'employee_id', otherKey: 'task_id', as: 'tasks' });

Task.hasMany(TaskAssignment, { foreignKey: 'task_id', as: 'assignments', onDelete: 'CASCADE' });
TaskAssignment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

Employee.hasMany(TaskAssignment, { foreignKey: 'employee_id', as: 'assignments', onDelete: 'CASCADE' });
TaskAssignment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// Task <-> TaskActivityLog
Task.hasMany(TaskActivityLog, { foreignKey: 'task_id', as: 'activity_logs', onDelete: 'CASCADE' });
TaskActivityLog.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskActivityLog, { foreignKey: 'user_id', as: 'activity_logs' });
TaskActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Department,
  Employee,
  TaskCategory,
  Task,
  TaskAssignment,
  TaskActivityLog
};
