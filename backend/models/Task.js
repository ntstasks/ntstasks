const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'task_categories',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('not_started', 'in_progress', 'on_hold', 'completed', 'cancelled'),
    defaultValue: 'not_started',
    allowNull: false
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  estimated_hours: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  actual_hours: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  approval_status: {
    type: DataTypes.ENUM('none', 'pending_review', 'approved', 'changes_requested'),
    defaultValue: 'none'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_monthly_planned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  planned_month: {
    type: DataTypes.STRING, // Format: YYYY-MM e.g. "2026-11"
    allowNull: true
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['due_date'] },
    { fields: ['planned_month'] },
    { fields: ['creator_id'] }
  ]
});

module.exports = Task;

