const pool = require("../config/db");
const moment = require("moment");
const xlsx = require("xlsx");
const fs = require("fs");
module.exports = {
  getAllUsers: async (req, res) => {
    const userTypes = [2, 3, 4, 5, 6];
    const placeholders = userTypes.map(() => "?").join(", ");
    const query = `SELECT * FROM users WHERE user_type IN (${placeholders}) ORDER BY id DESC`;
    pool.query(query, userTypes, (err, results) => {
      if (err) {
        console.error("Error fetching users:", err);
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

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    let sql = "";
    let params = [];

    if (!query) {
      sql = `
        SELECT DISTINCT locality FROM city_localities 
        WHERE LOWER(city) = LOWER(?) AND status = 'active'
        ORDER BY locality 
        LIMIT 10
      `;
      params = [city];
    } else {
      const searchTerm = `${query.toLowerCase()}%`;
      sql = `
        SELECT DISTINCT locality FROM city_localities 
        WHERE LOWER(city) = LOWER(?) 
          AND LOWER(locality) LIKE ?
          AND status = 'active'
        ORDER BY CHAR_LENGTH(locality)
      `;
      params = [city, searchTerm];
    }

    pool.query(sql, params, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Query failed" });
      }
      res.status(200).json(results);
    });
  },

  getTermsAndConditions: (req, res) => {
    pool.query("SELECT * FROM company_terms", (err, results) => {
      if (err) {
        console.error("Error fetching terms and conditions:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getPrivacyPolicy: (req, res) => {
    pool.query("SELECT * FROM company_privacy", (err, results) => {
      if (err) {
        console.error("Error fetching privacy policy:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getServices: (req, res) => {
    pool.query("SELECT * FROM company_services", (err, results) => {
      if (err) {
        console.error("Error fetching services:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getCareers: (req, res) => {
    pool.query("SELECT * FROM company_careers", (err, results) => {
      if (err) {
        console.error("Error fetching careers:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  insertCareer: async (req, res) => {
    const { description, job_title, preferred_location, salary, experience } =
      req.body;
    const upload_date = moment().format("YYYY-MM-DD");
    try {
      const insertQuery = `
        INSERT INTO company_careers 
        (description, job_title, upload_date, preferred_location, salary, experience) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      pool.query(
        insertQuery,
        [
          description,
          job_title || null,
          upload_date,
          preferred_location || null,
          salary || null,
          experience || null,
        ],
        (err, result) => {
          if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({
              status: "error",
              message: "Failed to insert career entry",
            });
          }
          return res.status(201).json({
            status: "success",
            message: "Career entry inserted successfully",
          });
        }
      );
    } catch (error) {
      console.error("Insert Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to insert career entry",
      });
    }
  },
  updateCareer: async (req, res) => {
    const { id } = req.query;
    const { description, job_title, preferred_location, salary, experience } =
      req.body;
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Career ID is required for update",
      });
    }
    try {
      const updateQuery = `
        UPDATE company_careers
        SET 
          description = ?,
          job_title = ?,
          preferred_location = ?,
          salary = ?,
          experience = ?
        WHERE id = ?
      `;
      pool.query(
        updateQuery,
        [
          description,
          job_title || null,
          preferred_location || null,
          salary || null,
          experience || null,
          id,
        ],
        (err, result) => {
          if (err) {
            console.error("Update Error:", err);
            return res.status(500).json({
              status: "error",
              message: "Failed to update career entry",
            });
          }
          if (result.affectedRows === 0) {
            return res.status(404).json({
              status: "error",
              message: "Career entry not found",
            });
          }
          return res.status(200).json({
            status: "success",
            message: "Career entry updated successfully",
          });
        }
      );
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update career entry",
      });
    }
  },
  deleteCareer: async (req, res) => {
    const { id } = req.query;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "Valid career ID is required" });
    }
    pool.query(
      "DELETE FROM company_careers WHERE id = ?",
      [id],
      (err, result) => {
        if (err) {
          console.error("Delete Error:", err);
          return res.status(500).json({ error: "Database delete failed" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Career not found" });
        }
        return res.status(200).json({ message: "Career deleted successfully" });
      }
    );
  },
  getAllPlaces: (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const stateFilter = req.query.state || "";
    const cityFilter = req.query.city || "";
    const limit = 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (search) {
      conditions.push("(state LIKE ? OR city LIKE ? OR locality LIKE ?)");
      const searchQuery = `%${search}%`;
      params.push(searchQuery, searchQuery, searchQuery);
    }
    if (stateFilter) {
      conditions.push("state = ?");
      params.push(stateFilter);
    }
    if (cityFilter) {
      conditions.push("city = ?");
      params.push(cityFilter);
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT id, state, city, locality, status
        FROM city_localities
        ${whereClause}
      ) AS distinct_places
    `;
    pool.query(countSql, params, (err, countResult) => {
      if (err) {
        console.error("Error counting places", err);
        return res.status(500).json({ error: "Something went wrong" });
      }
      const total = countResult[0].total;
      const dataSql = `
        SELECT DISTINCT id, state, city, locality, status
        FROM city_localities
        ${whereClause}
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `;
      const dataParams = [...params, limit, offset];
      pool.query(dataSql, dataParams, (err, results) => {
        if (err) {
          console.error("Error fetching places", err);
          return res.status(500).json({ error: "Something went wrong" });
        }
        res.status(200).json({
          page,
          perPage: limit,
          currentCount: results.length,
          totalPlaces: total,
          totalPages: Math.ceil(total / limit),
          data: results,
        });
      });
    });
  },
  getAllStates: (req, res) => {
    const query =
      "SELECT DISTINCT state, status FROM city_localities WHERE status = 'active'";
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching city_localities:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getAllCities: (req, res) => {
    const { state } = req.query;

    let query =
      "SELECT DISTINCT city, state, status FROM city_localities WHERE status = 'active'";
    let params = [];

    if (state) {
      query += " AND state = ?";
      params.push(state);
    }

    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching city_localities:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },

  deletePlace: (req, res) => {
    const { state, city, locality } = req.body;
    if (!state || !city || !locality) {
      return res
        .status(400)
        .json({ error: "State, City, and Locality are required" });
    }
    const deleteSql = `
    DELETE FROM city_localities 
    WHERE state = ? AND city = ? AND locality = ?
  `;
    pool.query(deleteSql, [state, city, locality], (err, result) => {
      if (err) {
        console.error("Error deleting place", err);
        return res.status(500).json({ error: "Something went wrong" });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "No matching place found to delete" });
      }
      res.status(200).json({ message: "Place deleted successfully" });
    });
  },
  editPlace: (req, res) => {
    const {
      oldState,
      oldCity,
      oldLocality,
      newState,
      newCity,
      newLocality,
      status,
    } = req.body;
    if (
      !oldState ||
      !oldCity ||
      !oldLocality ||
      !newState ||
      !newCity ||
      !newLocality
    ) {
      return res
        .status(400)
        .json({ error: "Old and new State, City, and Locality are required" });
    }
    const updateSql = `
      UPDATE city_localities 
      SET state = ?, city = ?, locality = ?, status = ?
      WHERE state = ? AND city = ? AND locality = ?
    `;
    pool.query(
      updateSql,
      [newState, newCity, newLocality, status, oldState, oldCity, oldLocality],
      (err, result) => {
        if (err) {
          console.error("Error updating place:", err);
          return res.status(500).json({ error: "Something went wrong" });
        }
        console.log("SQL Result:", result);
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "No matching place found to update" });
        }
        return res.status(200).json({
          message: `Updated ${result.affectedRows} record(s) successfully`,
        });
      }
    );
  },
  insertPlace: (req, res) => {
    const { state, city, locality, status } = req.body;
    if (!state || !city || !locality) {
      return res
        .status(400)
        .json({ error: "State, City, and Locality are required" });
    }
    const insertSql = `
    INSERT INTO city_localities (state, city, locality,status)
    VALUES (?, ?, ?,?)
  `;
    pool.query(insertSql, [state, city, locality, status], (err, result) => {
      if (err) {
        console.error("Error inserting place", err);
        return res.status(500).json({ error: "Something went wrong" });
      }
      res.status(201).json({ message: "Place added successfully" });
    });
  },
  insertPlacesExcell: (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Excel file is required" });
    }
    const filePath = req.file.path;
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      const insertData = [];
      const errors = [];
      jsonData.forEach((row, index) => {
        const { state, city, locality, status } = row;
        if (!state || !city || !locality) {
          errors.push(`Row ${index + 2} is missing required fields`);
          return;
        }
        insertData.push([
          state.trim(),
          city.trim(),
          locality.trim(),
          status !== undefined ? status : "inactive",
        ]);
      });
      fs.unlink(filePath, () => {});
      if (insertData.length === 0) {
        return res.status(400).json({ error: "No valid data found", errors });
      }
      const insertSql = `
        INSERT INTO city_localities (state, city, locality, status)
        VALUES ?
      `;
      pool.query(insertSql, [insertData], (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ error: "Database insert failed" });
        }
        return res.status(201).json({
          message: `${result.affectedRows} places inserted successfully`,
          errors,
        });
      });
    } catch (error) {
      fs.unlink(filePath, () => {});
      console.error("Excel parse error:", error);
      return res.status(500).json({ error: "Failed to process Excel file" });
    }
  },
  getPropertyLinks: (req, res) => {
    pool.query("SELECT * FROM property_links", (err, results) => {
      if (err) {
        console.error("Error fetching property links:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  insertPropertyLink: (req, res) => {
    const { link_title, city, location, property_for, property_in, sub_type } =
      req.body;
    if (!link_title || !city || !location || !property_for || !property_in) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const insertSql = `
      INSERT INTO property_links (link_title, city, location, property_for, property_in,sub_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    pool.query(
      insertSql,
      [link_title, city, location, property_for, property_in, sub_type],
      (err, result) => {
        if (err) {
          console.error("Error inserting property link:", err);
          return res.status(500).json({ error: "Database insert failed" });
        }
        res.status(201).json({ message: "Property link added successfully" });
      }
    );
  },
  deletePropertyLink: (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Property link ID is required" });
    }
    const deleteSql = "DELETE FROM property_links WHERE id = ?";
    pool.query(deleteSql, [id], (err, result) => {
      if (err) {
        console.error("Error deleting property link:", err);
        return res.status(500).json({ error: "Database delete failed" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Property link not found" });
      }
      res.status(200).json({ message: "Property link deleted successfully" });
    });
  },
  updatePropertyLink: (req, res) => {
    const {
      id,
      link_title,
      city,
      location,
      property_for,
      property_in,
      sub_type,
    } = req.body;
    if (
      !id ||
      !link_title ||
      !city ||
      !location ||
      !property_for ||
      !property_in
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const updateSql = `
      UPDATE property_links 
      SET link_title = ?, city = ?, location = ?, property_for = ?, property_in = ?, sub_type = ?
      WHERE id = ?
    `;
    pool.query(
      updateSql,
      [link_title, city, location, property_for, property_in, sub_type, id],
      (err, result) => {
        if (err) {
          console.error("Error updating property link:", err);
          return res.status(500).json({ error: "Database update failed" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Property link not found" });
        }
        res.status(200).json({ message: "Property link updated successfully" });
      }
    );
  },
};
