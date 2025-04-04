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
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    const searchTerm = `${query.toLowerCase()}%`;
    if (cache.has(searchTerm)) {
      console.log("Serving from cache");
      return res.status(200).json(cache.get(searchTerm));
    }
    const sql = `
        SELECT * FROM city_localities 
        WHERE LOWER(city) LIKE LOWER(?) OR LOWER(locality) LIKE LOWER(?) 
        ORDER BY CHAR_LENGTH(city), CHAR_LENGTH(locality) 
        LIMIT 20
    `;
    pool.query(sql, [searchTerm, searchTerm], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Query failed" });
      }
      cache.set(searchTerm, results);
      if (cache.size > CACHE_LIMIT) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      res.status(200).json(results);
    });
  },
};
