const pool = require("../config/db");
module.exports = {
  getAllUsersCount: async (req, res) => {
    pool.query(
      `SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type
       UNION ALL
       SELECT 'Total' as user_type, COUNT(*) as count FROM users`,
      (err, results) => {
        if (err) {
          console.error("Error fetching user counts:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        res.status(200).json(results);
      }
    );
  },
  getAllUsersByType: (req, res) => {
    const user_type = req.query.user_type ? req.query.user_type : null;
    let sql = "SELECT * FROM users";
    let countSql = "SELECT COUNT(*) AS count FROM users";
    let values = [];
    if (user_type) {
      sql += " WHERE user_type = ?";
      countSql += " WHERE user_type = ?";
      values.push(user_type);
    }
    pool.query(countSql, values, (err, countResult) => {
      if (err) {
        console.error("Error fetching user count:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      const userCount = countResult[0].count;
      pool.query(sql, values, (err, results) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        res
          .status(200)
          .json({ success: true, count: userCount, data: results });
      });
    });
  },
};
