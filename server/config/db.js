const mysql = require("mysql2/promise");

const DB_URL = process.env.DATABASE_URL;

let poolConfig;

if (DB_URL) {
  const u = new URL(DB_URL);
  poolConfig = {
    host: u.hostname,
    port: parseInt(u.port) || 4000,
    user: u.username,
    password: u.password,
    database: u.pathname.substring(1),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
} else {
  poolConfig = {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "sistema_matricula",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
