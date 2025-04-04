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
    const sql = `
        SELECT * FROM city_localities 
        WHERE MATCH(city, locality) AGAINST (? IN NATURAL LANGUAGE MODE) 
        LIMIT 20
    `;
    pool.query(sql, [query], (err, results) => {
      if (err) {
        console.log("err: ", err);
        return res.status(500).json({ error: "Query failed" });
      }
      res.status(200).json(results);
    });
  },
};
