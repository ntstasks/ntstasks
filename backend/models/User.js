const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'users_email_role_unique',
    set(val) {
      this.setDataValue('email', val.trim().toLowerCase());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'employee'),
    defaultValue: 'employee',
    allowNull: false,
    unique: 'users_email_role_unique'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
  // Plaintext passwords stored as requested: no bcrypt hashing hooks
});

User.prototype.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  // Direct plaintext comparison
  if (this.password === candidatePassword) {
    return true;
  }
  // Backward compatibility: match legacy bcrypt hashed records if any remain
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  return false;
};

module.exports = User;

