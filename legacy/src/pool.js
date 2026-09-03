const mysql = require('mysql');
const util = require('util');
let dbParams = {};

if (typeof process.env.db_name !== 'undefined') {
  dbParams = {
    database: process.env.db_name,
    host: process.env.db_host,
    password: process.env.db_password,
    port: process.env.db_port,
    user: process.env.db_user
  };
} else {
  const auth = require('../auth.json');
  if (process.env.NODE_ENV === 'dev') {
    dbParams = {
      database: auth.development.db.database,
      host: auth.development.db.host,
      password: auth.development.db.password,
      port: auth.development.db.port,
      user: auth.development.db.user
    };
  } else {
    dbParams = {
      database: auth.production.db.database,
      host: auth.production.db.host,
      password: auth.production.db.password,
      port: auth.production.db.port,
      user: auth.production.db.user
    };
  }
}

dbParams.connectionLimit = 10;

const pool = mysql.createPool(dbParams);

// Ping database to check for common exception errors.
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  }

  if (connection) {
    connection.release();
    console.log('Connection Released...');
  }

  return;
});

pool.query = util.promisify(pool.query);

module.exports = pool;
