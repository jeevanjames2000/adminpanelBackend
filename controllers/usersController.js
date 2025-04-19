const pool = require("../config/db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD");
const currentTime = moment().format("HH:mm:ss");
const uploadDir = "./uploads";
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
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
    const { user_type, name, search } = req.query.user_type || null;
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
      pool.query(sql, values, async (err, users) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        try {
          const userIds = users.map((user) => user.id);
          if (userIds.length === 0) {
            return res.status(200).json({
              success: true,
              count: 0,
              data: [],
            });
          }
          const placeholders = userIds.map(() => "?").join(",");
          const searchSql = `
  SELECT 
    sp.*, 
    p.property_name, 
    p.location_id, 
    p.google_address 
  FROM searched_properties sp 
  LEFT JOIN properties p 
    ON sp.property_id = p.unique_property_id 
  WHERE 
    sp.user_id IN (${placeholders}) 
    AND sp.property_id IS NOT NULL 
    AND sp.property_id != '' 
    AND sp.property_id != '0'
`;
          pool.query(searchSql, userIds, (err, searchedResults) => {
            if (err) {
              console.error("Error fetching searched properties:", err);
              return res
                .status(500)
                .json({ error: "Failed to get searched properties" });
            }
            const groupedSearches = {};
            searchedResults.forEach((item) => {
              if (!groupedSearches[item.user_id]) {
                groupedSearches[item.user_id] = [];
              }
              groupedSearches[item.user_id].push(item);
            });
            const enrichedUsers = users.map((user) => ({
              ...user,
              userActivity: groupedSearches[user.id] || [],
            }));
            res.status(200).json({
              success: true,
              count: userCount,
              data: enrichedUsers,
            });
          });
        } catch (error) {
          console.error("Unexpected error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });
    });
  },
  getAllUsersByTypeSearch: (req, res) => {
    const { user_type, name, search } = req.query;
    let sql = "SELECT * FROM users";
    let countSql = "SELECT COUNT(*) AS count FROM users";
    let whereClauses = [];
    let values = [];
    if (user_type) {
      whereClauses.push("user_type = ?");
      values.push(user_type);
    }
    if (name) {
      whereClauses.push("name LIKE ?");
      values.push(`%${name}%`);
    }
    if (search) {
      whereClauses.push("(name LIKE ? OR mobile LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    if (whereClauses.length > 0) {
      const whereStr = " WHERE " + whereClauses.join(" AND ");
      sql += whereStr;
      countSql += whereStr;
    }
    pool.query(countSql, values, (err, countResult) => {
      if (err) {
        console.error("Error fetching user count:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      const userCount = countResult[0].count;
      pool.query(sql, values, async (err, users) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        try {
          const userIds = users.map((user) => user.id);
          if (userIds.length === 0) {
            return res.status(200).json({
              success: true,
              count: 0,
              data: [],
            });
          }
          const placeholders = userIds.map(() => "?").join(",");
          let searchSql = `
          SELECT 
            sp.*, 
            p.property_name, 
            p.location_id, 
            p.google_address 
          FROM searched_properties sp 
          LEFT JOIN properties p 
            ON sp.property_id = p.unique_property_id 
          WHERE 
            sp.user_id IN (${placeholders}) 
            AND sp.property_id IS NOT NULL 
            AND sp.property_id != '' 
            AND sp.property_id != '0'
        `;
          let searchValues = [...userIds];
          if (search) {
            searchSql += ` AND (p.property_name LIKE ? OR p.google_address LIKE ?)`;
            searchValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
          }
          pool.query(searchSql, searchValues, (err, searchedResults) => {
            if (err) {
              console.error("Error fetching searched properties:", err);
              return res
                .status(500)
                .json({ error: "Failed to get searched properties" });
            }
            const groupedSearches = {};
            searchedResults.forEach((item) => {
              if (!groupedSearches[item.user_id]) {
                groupedSearches[item.user_id] = [];
              }
              groupedSearches[item.user_id].push(item);
            });
            const enrichedUsers = users.map((user) => ({
              ...user,
              userActivity: groupedSearches[user.id] || [],
            }));
            res.status(200).json({
              success: true,
              count: userCount,
              data: enrichedUsers,
            });
          });
        } catch (error) {
          console.error("Unexpected error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });
    });
  },
  createUser: async (req, res) => {
    const {
      name,
      mobile,
      email,
      designation,
      password,
      city,
      pincode,
      state,
      user_type,
      created_by,
      created_userID,
    } = req.body;
    console.log("user_type: ", user_type);
    if (!created_userID) {
      return res.status(400).json({ message: "User ID is required" });
    }
    try {
      const creatorCheckQuery = `SELECT id FROM users WHERE id = ?`;
      pool.query(
        creatorCheckQuery,
        [created_userID],
        (creatorErr, creatorResults) => {
          if (creatorErr) {
            console.error("Error checking creator ID:", creatorErr);
            return res
              .status(500)
              .json({ message: "Database error while checking creator ID" });
          }
          if (creatorResults.length === 0) {
            return res.status(403).json({ message: "User id Not found" });
          }
          const checkQuery = `SELECT * FROM users WHERE name = ? AND user_type = ?`;
          pool.query(checkQuery, [name, user_type], async (err, results) => {
            if (err) {
              console.error("Error checking for existing user:", err);
              return res
                .status(500)
                .json({ message: "Database error while checking user" });
            }
            if (results.length > 0) {
              return res.status(409).json({
                message: "User with the same name and user_type already exists",
              });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const currentDate = new Date().toISOString().slice(0, 10);
            const currentTime = new Date().toTimeString().slice(0, 8);
            const insertQuery = `
          INSERT INTO users
          (name, mobile, email, designation, password, city, pincode, state, user_type, created_by,
           created_date, created_time, status, created_userID)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
            const values = [
              name,
              mobile,
              email,
              designation,
              hashedPassword,
              city,
              pincode,
              state,
              user_type,
              created_by,
              currentDate,
              currentTime,
              0,
              created_userID,
            ];
            pool.query(insertQuery, values, (insertErr, result) => {
              if (insertErr) {
                console.error("Error inserting user:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database error while inserting user" });
              }
              res.status(201).json({
                message: "User registered successfully",
                userId: result.insertId,
              });
            });
          });
        }
      );
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
  createEmployee: async (req, res) => {
    const {
      name,
      mobile,
      email,
      designation,
      password,
      city,
      pincode,
      state,
      user_type,
      created_by,
      created_userID,
    } = req.body;
    if (!created_userID) {
      return res.status(400).json({ message: "User ID is required" });
    }
    try {
      const creatorCheckQuery = `SELECT id FROM users WHERE id = ?`;
      pool.query(
        creatorCheckQuery,
        [created_userID],
        (creatorErr, creatorResults) => {
          if (creatorErr) {
            console.error("Error checking creator ID:", creatorErr);
            return res
              .status(500)
              .json({ message: "Database error while checking creator ID" });
          }
          if (creatorResults.length === 0) {
            return res.status(403).json({ message: "User id Not found" });
          }
          const checkQuery = `SELECT * FROM employees WHERE name = ? AND user_type = ?`;
          pool.query(checkQuery, [name, user_type], async (err, results) => {
            if (err) {
              console.error("Error checking for existing user:", err);
              return res
                .status(500)
                .json({ message: "Database error while checking user" });
            }
            if (results.length > 0) {
              return res.status(409).json({
                message:
                  "employee with the same name and user_type already exists",
              });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const currentDate = new Date().toISOString().slice(0, 10);
            const currentTime = new Date().toTimeString().slice(0, 8);
            const insertQuery = `
          INSERT INTO employees
          (name, mobile, email, designation, password, city, pincode, state, user_type, created_by,
           created_date, created_time, status, created_userID)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
            const values = [
              name,
              mobile,
              email,
              designation,
              hashedPassword,
              city,
              pincode,
              state,
              user_type,
              created_by,
              currentDate,
              currentTime,
              0,
              created_userID,
            ];
            pool.query(insertQuery, values, (insertErr, result) => {
              if (insertErr) {
                console.error("Error inserting employee:", insertErr);
                return res
                  .status(500)
                  .json({ message: "Database error while inserting employee" });
              }
              res.status(201).json({
                message: "Epmloyee registered successfully",
                userId: result.insertId,
              });
            });
          });
        }
      );
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
  updateUser: async (req, res) => {
    const { id, ...fieldsToUpdate } = req.body;
    console.log("fieldsToUpdate: ", fieldsToUpdate);
    if (!id) {
      return res
        .status(400)
        .json({ message: "User ID is required for update" });
    }
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    try {
      const { name, user_type, password } = fieldsToUpdate;
      if (name && user_type) {
        const duplicateCheckQuery = `
        SELECT * FROM users WHERE name = ? AND user_type = ? AND id != ?
      `;
        const [results] = await pool
          .promise()
          .query(duplicateCheckQuery, [name, user_type, id]);
        if (results.length > 0) {
          return res.status(409).json({
            message:
              "Another user with the same name and user_type already exists",
          });
        }
      }
      if (password) {
        const salt = await bcrypt.genSalt(10);
        fieldsToUpdate.password = await bcrypt.hash(password, salt);
      }
      fieldsToUpdate.updated_date = currentDate;
      fieldsToUpdate.updated_time = currentTime;
      const updateFields = Object.keys(fieldsToUpdate)
        .map((field) => `${field} = ?`)
        .join(", ");
      const values = Object.values(fieldsToUpdate);
      values.push(id);
      const updateQuery = `UPDATE users SET ${updateFields} WHERE id = ?`;
      await pool.promise().query(updateQuery, values);
      res.status(200).json({ message: "User updated successfully" });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
  deleteUser: async (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ message: "User ID is required for deletion" });
    }
    const checkQuery = `SELECT id FROM users WHERE id = ?`;
    pool.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking user:", err);
        return res
          .status(500)
          .json({ message: "Database error while checking user" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      const deleteQuery = `DELETE FROM users WHERE id = ?`;
      pool.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error("Error deleting user:", err);
          return res
            .status(500)
            .json({ message: "Database error during user deletion" });
        }
        res.status(200).json({ message: "User deleted successfully" });
      });
    });
  },
  getAllEmp: (req, res) => {
    const { userID } = req.params;
    try {
      const query = `
      SELECT user_type, COUNT(*) AS count 
      FROM users 
      WHERE created_userID = ? 
      GROUP BY user_type
    `;
      pool.query(query, [userID], (err, results) => {
        if (err) {
          console.error("Error fetching grouped users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        const employeesQuery = `
        SELECT * FROM users WHERE created_userID = ?
      `;
        pool.query(employeesQuery, [userID], (empErr, empResults) => {
          if (empErr) {
            console.error("Error fetching employees:", empErr);
            return res.status(500).json({ error: "Database query failed" });
          }
          res.status(200).json({
            groupedCount: results,
            employees: empResults,
          });
        });
      });
    } catch (error) {
      console.error("Unexpected server error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
  getAllUsersUnder: (req, res) => {
    const { created_userID } = req.params;
    try {
      const query = `
      SELECT user_type, COUNT(*) AS count 
      FROM users 
      WHERE created_userID = ? 
      GROUP BY user_type
    `;
      pool.query(query, [created_userID], (err, results) => {
        if (err) {
          console.error("Error fetching grouped users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        const employeesQuery = `
        SELECT * FROM users WHERE created_userID = ?
      `;
        pool.query(employeesQuery, [created_userID], (empErr, empResults) => {
          if (empErr) {
            console.error("Error fetching employees:", empErr);
            return res.status(500).json({ error: "Database query failed" });
          }
          res.status(200).json({
            groupedCount: results,
            employees: empResults,
          });
        });
      });
    } catch (error) {
      console.error("Unexpected server error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
  getProfileData: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    try {
      pool.query(
        `SELECT * FROM users WHERE id = ? LIMIT 1`,
        [user_id],
        (err, results) => {
          if (err) {
            console.error("Error fetching profile:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          if (results.length === 0) {
            return res.status(404).json({ error: "Property not found" });
          }
          res.status(200).json(results[0]);
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  uploadUserImage: [
    upload.single("photo"),
    (req, res) => {
      const { user_id } = req.body;
      if (!req.file || !user_id) {
        return res.status(400).json({ message: "Missing file or id" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      const query = "UPDATE users SET photo = ? WHERE id = ?";
      pool.query(query, [fileUrl, user_id], (err, result) => {
        if (err) {
          console.error("DB update error:", err);
          return res.status(500).json({ message: "Error updating user photo" });
        }
        return res.status(200).json({
          message: "Image uploaded and user photo updated",
          photo: fileUrl,
          user_id,
        });
      });
    },
  ],
};
