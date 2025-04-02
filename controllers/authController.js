const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";
module.exports = {
  login: async (req, res) => {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password) {
        return res
          .status(400)
          .json({ error: "Mobile and password are required" });
      }
      pool.query(
        "SELECT * FROM users WHERE mobile = ?",
        [mobile],
        (err, results) => {
          if (err) {
            console.error("❌ Database query error:", err);
            return res.status(500).json({ error: "Internal server error" });
          }
          if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
          }
          const user = results[0];
          if (password !== user.password) {
            return res.status(401).json({ error: "Invalid credentials" });
          }
          const token = jwt.sign(
            { id: user.id, mobile: user.mobile },
            JWT_SECRET,
            { expiresIn: "1h" }
          );
          const { password: _, ...userData } = user;
          res.json({ message: "Login successful", user: userData, token });
        }
      );
    } catch (error) {
      console.error("❌ Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
