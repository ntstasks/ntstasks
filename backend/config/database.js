const path = require('path');
const fs = require('fs');

// Attempt loading .env from root, backend, or current working directory
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env')
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}
require('dotenv').config();

process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const { Sequelize } = require('sequelize');

const dbName = process.env.PSQL_DATABASE || 'postgres';
const dbUser = process.env.PSQL_USERNAME || 'postgres';
const dbPass = process.env.PSQL_PASSWORD || '';
const dbHost = process.env.PSQL_HOST || 'localhost';
const dbPort = parseInt(process.env.PSQL_PORT || '5432', 10);
const sslMode = process.env.PSQL_SSLMODE;

const dialectOptions = {};
if (sslMode && sslMode !== 'disable') {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
} else if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

const pool = {
  max: 15,
  min: 0,
  acquire: 30000,
  idle: 10000
};

const define = {
  underscored: true,
  timestamps: true
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions,
      timezone: '+05:30',
      logging: false,
      define,
      pool
    })
  : new Sequelize(dbName, dbUser, dbPass, {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      dialectOptions,
      timezone: '+05:30',
      logging: false,
      define,
      pool
    });

module.exports = { sequelize };
