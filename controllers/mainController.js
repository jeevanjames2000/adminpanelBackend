const pool = require("../config/db");

module.exports = {
  getAllUsers: async (req, res) => {
    pool.query("SELECT * FROM users", (err, results) => {
      if (err) {
        console.error("❌ Error fetching users:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getAllLocalities: (req, res) => {
    pool.query("SELCT * from cities", (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Query failed" });
      }
      res.status(200).json(results);
    });
  },
};
