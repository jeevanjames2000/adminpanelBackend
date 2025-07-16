const pool = require("../config/db");
const bcrypt = require("bcrypt");
const moment = require("moment");
const currentDate = moment().format("YYYY-MM-DD");
const currentTime = moment().format("HH:mm:ss");
const uploadDir = "./uploads";
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
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
  getAllEmployeeCount: async (req, res) => {
    pool.query(
      `SELECT user_type, COUNT(*) as count FROM employees GROUP BY user_type
       UNION ALL
       SELECT 'Total' as user_type, COUNT(*) as count FROM employees`,
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
    const { user_type, name, search } = req.query;
    let sql = "SELECT * FROM users";
    let countSql = "SELECT COUNT(*) AS count FROM users";
    let values = [];
    let countValues = [];
    if (user_type) {
      sql += " WHERE user_type = ?";
      countSql += " WHERE user_type = ?";
      values.push(user_type);
      countValues.push(user_type);
    }
    sql += " ORDER BY id DESC";
    pool.query(countSql, countValues, (err, countResult) => {
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
  getAllEmployeesByTypeSearch: (req, res) => {
    const { user_type, id, search } = req.query;
    let sql = "SELECT * FROM employees";
    let countSql = "SELECT COUNT(*) AS count FROM employees";
    let whereClauses = [];
    let values = [];
    if (user_type) {
      whereClauses.push("user_type = ?");
      values.push(user_type);
    }
    if (id) {
      whereClauses.push("id LIKE ?");
      values.push(`%${id}%`);
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
      if (err) return res.status(500).json({ error: "Database query failed" });
      const userCount = countResult[0].count;
      pool.query(sql, values, async (err, employees) => {
        if (err)
          return res.status(500).json({ error: "Database query failed" });
        try {
          const employeeIds = employees.map((emp) => emp.id);
          if (employeeIds.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
          }
          const empPlaceholders = employeeIds.map(() => "?").join(",");
          const [userErr, users] = await new Promise((resolve) => {
            const userSql = `
            SELECT id, user_type, photo, name, mobile, email, city, address,
              subscription_package, subscription_start_date, subscription_expiry_date,
              subscription_status, assigned_emp_id, assigned_emp_type, assigned_emp_name
            FROM users
            WHERE assigned_emp_id IN (${empPlaceholders})
          `;
            pool.query(userSql, employeeIds, (err, result) =>
              resolve([err, result])
            );
          });
          if (userErr) throw userErr;
          const [activityErr, activityLogs] = await new Promise((resolve) => {
            const activitySql = `
            SELECT employee_id, created_date
            FROM employee_activity
            WHERE employee_id IN (${empPlaceholders})
            ORDER BY created_date DESC
          `;
            pool.query(activitySql, employeeIds, (err, result) =>
              resolve([err, result])
            );
          });
          if (activityErr) throw activityErr;
          const latestActivityMap = {};
          for (const log of activityLogs) {
            if (!latestActivityMap[log.employee_id]) {
              latestActivityMap[log.employee_id] = log.created_date;
            }
          }
          const employeeUserMap = {};
          users.forEach((user) => {
            const empId = user.assigned_emp_id;
            const activityDate = latestActivityMap[empId]
              ? moment(latestActivityMap[empId]).format("YYYY-MM-DD")
              : null;
            const userWithActivity = {
              ...user,
              created_date: activityDate,
            };
            if (!employeeUserMap[empId]) employeeUserMap[empId] = [];
            employeeUserMap[empId].push(userWithActivity);
          });
          const enrichedEmployees = employees.map((emp) => ({
            ...emp,
            created_date: emp.created_date
              ? moment(emp.created_date).format("YYYY-MM-DD")
              : null,
            created_time: emp.created_time
              ? moment(emp.created_time, "HH:mm:ss").format("HH:mm:ss")
              : null,
            assigned_users: employeeUserMap[emp.id] || [],
          }));
          res.status(200).json({
            success: true,
            count: userCount,
            data: enrichedEmployees,
          });
        } catch (error) {
          console.error("Unexpected error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });
    });
  },
  assignEmployee: (req, res) => {
    const {
      user_id,
      user_name,
      user_type,
      assigned_for,
      created_by,
      employee_id,
      employee_name,
      designation,
      employee_type,
      city,
    } = req.body;
    if (
      !user_id ||
      !employee_id ||
      !employee_name ||
      !employee_type ||
      !user_name ||
      !user_type
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const created_date = moment().format("YYYY-MM-DD");
    const updateUserSql = `
      UPDATE users 
      SET assigned_emp_id = ?, 
          assigned_emp_name = ?, 
          assigned_emp_type = ? 
      WHERE id = ?
    `;
    const insertActivitySql = `
      INSERT INTO employee_activity (
        employee_id, employee_name, designation, employee_type, city,
        assigned_user_id, assigned_user_name, assigned_user_type,
        assigned_for, created_date, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    pool.query(
      updateUserSql,
      [employee_id, employee_name, employee_type, user_id],
      (err, result) => {
        if (err) {
          console.error("Error updating user:", err);
          return res
            .status(500)
            .json({ error: "Failed to assign employee to user" });
        }
        pool.query(
          insertActivitySql,
          [
            employee_id,
            employee_name,
            designation,
            employee_type,
            city,
            user_id,
            user_name,
            user_type,
            assigned_for,
            created_date,
            created_by,
          ],
          (activityErr, activityRes) => {
            if (activityErr) {
              console.error(
                "Error inserting into employee_activity:",
                activityErr
              );
              return res
                .status(500)
                .json({ error: "Failed to log employee activity" });
            }
            res.status(200).json({
              success: true,
              message: "User assigned and activity logged successfully",
            });
          }
        );
      }
    );
  },
  createUser: async (req, res) => {
    const {
      name,
      mobile,
      email,
      city,
      pincode,
      state,
      user_type,
      created_by,
      created_userID,
      gst_number,
      rera_number,
      company_name,
      address,
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
            const currentDate = new Date().toISOString().slice(0, 10);
            const currentTime = new Date().toTimeString().slice(0, 8);
            const insertQuery = `
          INSERT INTO users
          (name, mobile, email, city, pincode, state, user_type, created_by,
           created_date, created_time, status, created_userID,gst_number,rera_number,company_name,address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
            const values = [
              name,
              mobile,
              email,
              city,
              pincode,
              state,
              user_type,
              created_by,
              currentDate,
              currentTime,
              0,
              created_userID,
              gst_number,
              rera_number,
              company_name,
              address,
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
      const creatorCheckQuery = `SELECT id FROM employees WHERE id = ?`;
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
            const currentDate = moment().format("YYYY-MM-DD");
            const currentTime = moment().format("HH:mm:ss");
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
                message: "Employee registered successfully",
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
  updateEmployee: async (req, res) => {
    const { id, ...fieldsToUpdate } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ message: "Employee ID is required for update" });
    }
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    try {
      const { name, user_type, password } = fieldsToUpdate;
      if (name && user_type) {
        const duplicateCheckQuery = `
        SELECT * FROM employees WHERE name = ? AND user_type = ? AND id != ?
      `;
        const [results] = await pool
          .promise()
          .query(duplicateCheckQuery, [name, user_type, id]);
        if (results.length > 0) {
          return res.status(409).json({
            message:
              "Another employee with the same name and user_type already exists",
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
      const updateQuery = `UPDATE employees SET ${updateFields} WHERE id = ?`;
      await pool.promise().query(updateQuery, values);
      res.status(200).json({ message: "Employee updated successfully" });
    } catch (err) {
      console.error("Update error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
  deleteEmployee: async (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ message: "Employee ID is required for deletion" });
    }
    const checkQuery = `SELECT id FROM employees WHERE id = ?`;
    pool.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking employee:", err);
        return res
          .status(500)
          .json({ message: "Database error while checking user" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Employee not found" });
      }
      const deleteQuery = `DELETE FROM employees WHERE id = ?`;
      pool.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error("Error deleting employee:", err);
          return res
            .status(500)
            .json({ message: "Database error during employee deletion" });
        }
        res.status(200).json({ message: "Employee deleted successfully" });
      });
    });
  },
  updateUser: async (req, res) => {
    const { id, ...fieldsToUpdate } = req.body;
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
      FROM employees 
      WHERE created_userID = ? 
      GROUP BY user_type
    `;
      pool.query(query, [userID], (err, results) => {
        if (err) {
          console.error("Error fetching grouped users:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        const employeesQuery = `
        SELECT * FROM employees WHERE created_userID = ?
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
  getEmpProfileData: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    try {
      pool.query(
        `SELECT * FROM employees WHERE id = ? LIMIT 1`,
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
      const fileUrl = `uploads/${req.file.filename}`;
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
  uploadEmpImage: [
    upload.single("photo"),
    (req, res) => {
      const { user_id } = req.body;
      if (!req.file || !user_id) {
        return res.status(400).json({ message: "Missing file or id" });
      }
      const fileUrl = `uploads/${req.file.filename}`;
      const query = "UPDATE employees SET photo = ? WHERE id = ?";
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
  insertOrUpdateToken: async (req, res) => {
    const { user_id, push_token } = req.body;
    if (!user_id || !push_token) {
      return res.status(400).json({ error: "user_id and token are required" });
    }
    try {
      pool.query(
        `SELECT id FROM users WHERE id = ?`,
        [user_id],
        (err, results) => {
          if (err) {
            console.error("Error checking user:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
          }
          pool.query(
            `SELECT user_id FROM tokens WHERE user_id = ?`,
            [user_id],
            (err, tokenResults) => {
              if (err) {
                console.error("Error checking token:", err);
                return res.status(500).json({ error: "Database query failed" });
              }
              if (tokenResults.length > 0) {
                pool.query(
                  `UPDATE tokens SET push_token = ? WHERE user_id = ?`,
                  [push_token, user_id],
                  (err, updateResults) => {
                    if (err) {
                      console.error("Error updating token:", err);
                      return res
                        .status(500)
                        .json({ error: "Database query failed" });
                    }
                    res
                      .status(200)
                      .json({ message: "Token updated successfully" });
                  }
                );
              } else {
                pool.query(
                  `INSERT INTO tokens (user_id, push_token, created_at) 
                   VALUES (?, ?, NOW())`,
                  [user_id, push_token],
                  (err, insertResults) => {
                    if (err) {
                      console.error("Error inserting token:", err);
                      return res
                        .status(500)
                        .json({ error: "Database query failed" });
                    }
                    res
                      .status(201)
                      .json({ message: "Token created successfully" });
                  }
                );
              }
            }
          );
        }
      );
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getTokens: async (req, res) => {
    const { user_id } = req.query;
    try {
      let query = `
      SELECT t.user_id, t.push_token, t.created_at, u.name 
      FROM tokens t
      JOIN users u ON t.user_id = u.id
    `;
      let params = [];
      if (user_id) {
        query += ` WHERE t.user_id = ?`;
        params.push(user_id);
      }
      pool.query(query, params, (err, results) => {
        if (err) {
          console.error("Error fetching tokens:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ error: "No tokens found for user" });
        }
        res.status(200).json(results);
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  sendToSingleUser: (req, res) => {
    const { user_id, title, message } = req.body;
    pool.query(
      "SELECT push_token FROM tokens WHERE user_id = ?",
      [user_id],
      async (err, rows) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (!rows.length || !Expo.isExpoPushToken(rows[0].push_token)) {
          return res
            .status(400)
            .json({ error: "Invalid or missing push token" });
        }
        const messages = [
          {
            to: rows[0].push_token,
            sound: "default",
            title: title || "Notification",
            body: message || "You have a new message",
            data: { withSome: "data" },
          },
        ];
        try {
          let chunks = expo.chunkPushNotifications(messages);
          let tickets = [];
          for (let chunk of chunks) {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          }
          pool.query(
            "INSERT INTO notification_history (user_id, title, message) VALUES (?, ?, ?)",
            [user_id, title || null, message || null],
            (err) => {
              if (err) {
                console.error("History insert error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to save notification history" });
              }
              return res.json({ success: true, tickets });
            }
          );
        } catch (error) {
          console.error("Push error", error);
          return res
            .status(500)
            .json({ error: "Something went wrong while sending notification" });
        }
      }
    );
  },
  sendToAllUsers: (req, res) => {
    const { title, message } = req.body;
    pool.query(
      "SELECT user_id, push_token FROM tokens WHERE push_token IS NOT NULL",
      async (err, rows) => {
        if (err) {
          console.error("DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }
        const validUsers = rows.filter((row) =>
          Expo.isExpoPushToken(row.push_token)
        );
        const messages = validUsers.map((row) => ({
          to: row.push_token,
          sound: "default",
          title: title || "Notification",
          body: message || "You have a new announcement",
          data: { withSome: "data" },
        }));
        try {
          let chunks = expo.chunkPushNotifications(messages);
          let tickets = [];
          for (let chunk of chunks) {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          }
          const insertTasks = validUsers.map((user) => {
            return new Promise((resolve, reject) => {
              pool.query(
                "INSERT INTO notification_history (user_id, title, message) VALUES (?, ?, ?)",
                [user.user_id, title || null, message || null],
                (err) => (err ? reject(err) : resolve())
              );
            });
          });
          await Promise.all(insertTasks);
          return res.json({ success: true, count: tickets.length, tickets });
        } catch (error) {
          console.error("Push error", error);
          return res.status(500).json({ error: "Something went wrong" });
        }
      }
    );
  },
  getAllNotificationHistory: (req, res) => {
    pool.query(
      "SELECT * FROM notification_history ORDER BY created_at DESC",
      (err, results) => {
        if (err) {
          console.error("Error fetching notification history:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.status(200).json({ notifications: results });
      }
    );
  },
  createShorts: (req, res) => {
    const { unique_property_id, property_name, short_type, shorts_order } =
      req.body;
    if (
      !unique_property_id ||
      !property_name ||
      !short_type ||
      shorts_order === undefined
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const query = `
      INSERT INTO shorts (unique_property_id, property_name, short_type, shorts_order, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const values = [
      unique_property_id,
      property_name,
      short_type,
      shorts_order,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting short:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({
        message: "Short created successfully",
        id: result.insertId,
      });
    });
  },
  getAllShorts: (req, res) => {
    const query = `
      SELECT 
        shorts.*, 
        properties.property_name AS property_name_from_properties,
        properties.* 
      FROM shorts
      JOIN properties 
        ON shorts.unique_property_id COLLATE utf8mb4_unicode_ci = properties.unique_property_id COLLATE utf8mb4_unicode_ci
      ORDER BY RAND()
    `;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching shorts with properties:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json(results);
    });
  },
  getUserCompleteActivity: async (req, res) => {
    const { user_type, user_id, name, search } = req.query;
    let baseQuery = `
    SELECT 
      id,
      user_type,
      name,
      mobile,
      email,
      photo,
      status,
      created_date,
      created_time,
      updated_date,
      updated_time,
      state,
      city,
      address,
      pincode,
      gst_number,
      rera_number,
      uploaded_from_seller_panel,
      designation,
      subscription_package,
      subscription_start_date,
      subscription_expiry_date,
      subscription_status,
      created_by
    FROM users
  `;

    let countQuery = "SELECT COUNT(*) AS count FROM users";
    const whereClauses = [];
    const values = [];
    if (user_type) {
      whereClauses.push("user_type = ?");
      values.push(user_type);
    }
    if (name) {
      whereClauses.push("name LIKE ?");
      values.push(`%${name}%`);
    }
    if (user_id) {
      whereClauses.push("id = ?");
      values.push(user_id);
    }
    if (search) {
      whereClauses.push("(name LIKE ? OR mobile LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    const whereStr = whereClauses.length
      ? " WHERE " + whereClauses.join(" AND ")
      : "";
    baseQuery += whereStr;
    countQuery += whereStr;
    try {
      const [countResult] = await pool.promise().query(countQuery, values);
      const userCount = countResult[0].count;
      const [users] = await pool.promise().query(baseQuery, values);
      const userIds = users.map((user) => user.id);
      if (userIds.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      const placeholders = userIds.map(() => "?").join(",");
      const searchParams = [...userIds];
      if (search) searchParams.push(`%${search}%`, `%${search}%`);
      const searchQuery = `
        SELECT sp.*, p.property_name,p.city_id, p.location_id, p.google_address 
        FROM searched_properties sp 
        LEFT JOIN properties p ON sp.property_id = p.unique_property_id 
        WHERE sp.user_id IN (${placeholders})
          AND sp.property_id IS NOT NULL 
          AND sp.property_id != '' 
          AND sp.property_id != '0'
          ${
            search
              ? "AND (p.property_name LIKE ? OR p.google_address LIKE ?)"
              : ""
          }
      `;
      const contactQuery = `
        SELECT cs.*, p.property_name,p.city_id, p.location_id, p.google_address 
        FROM contact_seller cs 
        LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id 
        WHERE cs.user_id IN (${placeholders})
      `;
      const viewsQuery = `
        SELECT pv.*, p.property_name, p.city_id,p.location_id, p.google_address 
        FROM property_views pv 
        LEFT JOIN properties p ON pv.property_id = p.unique_property_id 
        WHERE pv.user_id IN (${placeholders})
      `;
      const favouritesQuery = `
      SELECT 
        f.user_id,
        f.unique_property_id,
        p.property_name,
        p.sub_type,
        p.property_for,
        p.city_id,
        p.location_id,
        p.property_cost,
        p.property_in,
        p.google_address,
        u.name AS userName,
        u.mobile AS userMobile,
        u.email AS userEmail
      FROM favourites f
      LEFT JOIN properties p ON f.unique_property_id = p.unique_property_id
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.user_id IN (${placeholders})
      GROUP BY f.user_id, f.unique_property_id
    `;

      const [[searched], [contacted], [viewed], [favourites]] =
        await Promise.all([
          pool.promise().query(searchQuery, searchParams),
          pool.promise().query(contactQuery, userIds),
          pool.promise().query(viewsQuery, userIds),
          pool.promise().query(favouritesQuery, userIds),
        ]);
      const groupByUser = (data) =>
        data.reduce((acc, item) => {
          if (
            !acc[
              item.user_id && item.user_id !== 0
                ? item.user_id
                : item.User_user_id
            ]
          ) {
            acc[
              item.user_id && item.user_id !== 0
                ? item.user_id
                : item.User_user_id
            ] = [];
          }
          acc[
            item.user_id && item.user_id !== 0
              ? item.user_id
              : item.User_user_id
          ].push(item);
          return acc;
        }, {});
      const groupedSearches = groupByUser(searched);
      const groupedContacts = groupByUser(contacted);
      const groupedViews = groupByUser(viewed);
      const enrichedUsers = users.map((user) => {
        const activities = [];
        (favourites || []).forEach((item) => {
          activities.push({ ...item, activityType: "Liked" });
        });
        (groupedSearches[user.id] || []).forEach((item) => {
          activities.push({ ...item, activityType: "Searched" });
        });
        (groupedContacts[user.id] || []).forEach((item) => {
          activities.push({ ...item, activityType: "Contacted" });
        });
        (groupedViews[user.id] || []).forEach((item) => {
          activities.push({ ...item, activityType: "Property Viewed" });
        });
        return {
          ...user,
          userActivity: activities,
        };
      });
      res.status(200).json({
        success: true,
        count: userCount,
        data: enrichedUsers,
      });
    } catch (err) {
      console.error("Error in getUserCompleteActivity:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateProfileStatus: async (req, res) => {
    const { user_id, verified } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (typeof verified === "undefined" || (verified !== 0 && verified !== 1)) {
      return res.status(400).json({ message: "Verified value must be 0 or 1" });
    }

    try {
      const currentDate = moment().format("YYYY-MM-DD");
      const currentTime = moment().format("HH:mm:ss");

      const query = `
      UPDATE users
      SET verified = ?, updated_date = ?, updated_time = ?
      WHERE id = ?
    `;
      const values = [verified, currentDate, currentTime, user_id];

      await pool.promise().query(query, values);

      return res
        .status(200)
        .json({ message: "Profile status updated successfully" });
    } catch (error) {
      console.error("updateProfileStatus error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
