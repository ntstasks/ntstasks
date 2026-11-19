const { sequelize } = require('../config/database');
const User = require('./User');
const Department = require('./Department');
const Employee = require('./Employee');
const TaskCategory = require('./TaskCategory');
const Task = require('./Task');
const TaskAssignment = require('./TaskAssignment');
const TaskComment = require('./TaskComment');
const TaskAttachment = require('./TaskAttachment');
const TaskActivityLog = require('./TaskActivityLog');
const TaskStatusHistory = require('./TaskStatusHistory');
const Notification = require('./Notification');

// User <-> Employee
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee', onDelete: 'CASCADE' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Department <-> Employee
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees', onDelete: 'SET NULL' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Department <-> Task
Department.hasMany(Task, { foreignKey: 'department_id', as: 'tasks', onDelete: 'SET NULL' });
Task.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

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

// Task <-> TaskComment
Task.hasMany(TaskComment, { foreignKey: 'task_id', as: 'comments', onDelete: 'CASCADE' });
TaskComment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskComment, { foreignKey: 'user_id', as: 'comments' });
TaskComment.belongsTo(User, { foreignKey: 'user_id', as: 'author', include: [{ model: Employee, as: 'employee' }] });

// Task <-> TaskAttachment
Task.hasMany(TaskAttachment, { foreignKey: 'task_id', as: 'attachments', onDelete: 'CASCADE' });
TaskAttachment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskAttachment, { foreignKey: 'user_id', as: 'attachments' });
TaskAttachment.belongsTo(User, { foreignKey: 'user_id', as: 'uploader' });

// Task <-> TaskActivityLog
Task.hasMany(TaskActivityLog, { foreignKey: 'task_id', as: 'activity_logs', onDelete: 'CASCADE' });
TaskActivityLog.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskActivityLog, { foreignKey: 'user_id', as: 'activity_logs' });
TaskActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Task <-> TaskStatusHistory
Task.hasMany(TaskStatusHistory, { foreignKey: 'task_id', as: 'status_history', onDelete: 'CASCADE' });
TaskStatusHistory.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskStatusHistory, { foreignKey: 'changed_by', as: 'status_changes' });
TaskStatusHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'user' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'recipient' });
User.hasMany(Notification, { foreignKey: 'sender_id', as: 'sent_notifications', onDelete: 'SET NULL' });
Notification.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Task.hasMany(Notification, { foreignKey: 'task_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });

module.exports = {
  sequelize,
  User,
  Department,
  Employee,
  TaskCategory,
  Task,
  TaskAssignment,
  TaskComment,
  TaskAttachment,
  TaskActivityLog,
  TaskStatusHistory,
  Notification
};

