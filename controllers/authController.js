const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
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
            console.error("Database query error:", err);
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
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  loginAgents: (req, res) => {
    const { mobile, password } = req.body;
    console.log("password: ", password);
    if (!mobile || !password) {
      return res
        .status(400)
        .json({ message: "Mobile and password are required" });
    }

    const query = `SELECT * FROM users WHERE mobile = ?`;

    pool.query(query, [mobile], async (err, results) => {
      console.log("results: ", results);
      if (err) {
        console.error("Database error during login:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid mobile or password" });
      }

      const user = results[0];

      if (!user.password) {
        return res.status(500).json({ message: "Password not found for user" });
      }

      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("isPasswordValid: ", isPasswordValid);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Invalid mobile or password" });
        }
        const token = jwt.sign(
          { id: user.id, mobile: user.mobile },
          JWT_SECRET,
          {
            expiresIn: "7h",
          }
        );

        res.status(200).json({
          message: "Login successful",
          user: {
            user_id: user.id,
            mobile: user.mobile,
            name: user.name,
            user_type: user.user_type,
            email: user.email,
            state: user.state,
            city: user.city,
            pincode: user.pincode,
            status: user.status,
            created_userID: user.created_userID,
            created_by: user.created_by,
          },
          token,
        });
      } catch (compareError) {
        console.error("Bcrypt compare error:", compareError);
        return res
          .status(500)
          .json({ message: "Error while verifying password" });
      }
    });
  },
};
