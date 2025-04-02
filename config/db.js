require("dotenv").config();
const mysql = require("mysql2");
const pool = mysql.createPool({
  host: "65.1.255.234",
  user: "meetowneruser",
  password: "mE@gd863bvhg2v4v32v",
  database: "meetownerTest",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database!");
    connection.release();
  }
});
module.exports = pool;
