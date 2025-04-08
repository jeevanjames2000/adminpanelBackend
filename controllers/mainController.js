const pool = require("../config/db");
const cache = new Map();
const CACHE_LIMIT = 5;
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
    pool.query("SELECT * FROM `city_localities`", (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Query failed" });
      }
      res.status(200).json(results);
    });
  },
  searchLocalities: (req, res) => {
    const { city, query } = req.query;
    if (!city || !query) {
      return res
        .status(400)
        .json({ error: "City and search query are required" });
    }
    const searchTerm = `${query.toLowerCase()}%`;
    const sql = `
    SELECT locality FROM city_localities 
    WHERE LOWER(city) = LOWER(?) AND LOWER(locality) LIKE ?
    ORDER BY CHAR_LENGTH(locality)
  `;
    pool.query(sql, [city, searchTerm], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Query failed" });
      }
      res.status(200).json(results);
    });
  },
};
