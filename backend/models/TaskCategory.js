const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskCategory = sequelize.define('TaskCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6'
  }
}, {
  tableName: 'task_categories',
  timestamps: true
});

module.exports = TaskCategory;

