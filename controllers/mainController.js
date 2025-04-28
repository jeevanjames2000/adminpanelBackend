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
    SELECT DISTINCT  locality FROM city_localities 
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
  getAllPlaces: (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const limit = 10;
    const offset = (page - 1) * limit;
    const searchQuery = `%${search}%`;
    const whereCondition = search
      ? "WHERE state LIKE ? OR city LIKE ? OR locality LIKE ?"
      : "";
    const countSql = `SELECT COUNT(*) AS total FROM (
                    SELECT DISTINCT id, state, city, locality 
                    FROM city_localities 
                    ${whereCondition}
                  ) AS distinct_places`;

    const countParams = search ? [searchQuery, searchQuery, searchQuery] : [];
    pool.query(countSql, countParams, (err, countResult) => {
      if (err) {
        console.error("Error counting places", err);
        return res.status(500).json({ error: "Something went wrong" });
      }
      const total = countResult[0].total;
      const dataSql = `
  SELECT DISTINCT id, state, city, locality 
  FROM city_localities
  ${whereCondition}  -- Move the WHERE condition here
  ORDER BY id DESC
  LIMIT ? OFFSET ?
`;

      const dataParams = search
        ? [searchQuery, searchQuery, searchQuery, limit, offset]
        : [limit, offset];
      pool.query(dataSql, dataParams, (err, results) => {
        if (err) {
          console.error("Error fetching places", err);
          return res.status(500).json({ error: "Something went wrong" });
        }
        res.status(200).json({
          page: page,
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
    pool.query("SELECT state FROM city_localities", (err, results) => {
      if (err) {
        console.error("Error fetching city_localities:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.status(200).json(results);
    });
  },
  getAllCities: (req, res) => {
    pool.query("SELECT city FROM city_localities", (err, results) => {
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
    const { oldState, oldCity, oldLocality, newState, newCity, newLocality } =
      req.body;

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
    SET state = ?, city = ?, locality = ?
    WHERE state = ? AND city = ? AND locality = ?
  `;

    pool.query(
      updateSql,
      [newState, newCity, newLocality, oldState, oldCity, oldLocality],
      (err, result) => {
        if (err) {
          console.error("Error updating place", err);
          return res.status(500).json({ error: "Something went wrong" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "No matching place found to update" });
        }

        res.status(200).json({ message: "Place updated successfully" });
      }
    );
  },
  insertPlace: (req, res) => {
    const { state, city, locality } = req.body;

    if (!state || !city || !locality) {
      return res
        .status(400)
        .json({ error: "State, City, and Locality are required" });
    }

    const insertSql = `
    INSERT INTO city_localities (state, city, locality)
    VALUES (?, ?, ?)
  `;

    pool.query(insertSql, [state, city, locality], (err, result) => {
      if (err) {
        console.error("Error inserting place", err);
        return res.status(500).json({ error: "Something went wrong" });
      }

      res.status(201).json({ message: "Place added successfully" });
    });
  },
};
