const pool = require("../config/db");
module.exports = {
  getAllProperties: async (req, res) => {
    try {
      pool.query(
        `SELECT COUNT(*) AS total_count FROM properties`,
        (err, countResults) => {
          if (err) {
            console.error("Error fetching total count:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          const total_count = countResults[0].total_count;
          pool.query(
            `SELECT * FROM properties ORDER BY created_date DESC`,
            (err, results) => {
              if (err) {
                console.error("Error fetching properties:", err);
                return res.status(500).json({ error: "Database query failed" });
              }
              res.status(200).json({ total_count, properties: results });
            }
          );
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getListingsByLimit: (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      pool.query(
        `SELECT COUNT(*) AS total_count FROM properties`,
        (err, countResults) => {
          if (err) {
            console.error("Error fetching total count:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          const total_count = countResults[0].total_count;
          const total_pages = Math.ceil(total_count / limit);
          if (page > total_pages) {
            return res.status(200).json({
              total_count,
              total_pages,
              current_page: page,
              properties: [],
              message: "No more items left",
            });
          }
          pool.query(
            `SELECT * FROM properties ORDER BY created_date DESC LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, results) => {
              if (err) {
                console.error("Error fetching properties:", err);
                return res.status(500).json({ error: "Database query failed" });
              }
              res.status(200).json({
                total_count,
                total_pages,
                current_page: page,
                properties: results,
              });
            }
          );
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getListingsFilters: (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const propertyIn = req.query.property_in || null;
      const propertyFor = req.query.property_for || null;
      const status = req.query.status || null;
      let filters = [];
      let values = [];
      if (propertyIn) {
        filters.push("property_in = ?");
        values.push(propertyIn);
      }
      if (propertyFor) {
        filters.push("property_for = ?");
        values.push(propertyFor);
      }
      if (status !== null) {
        filters.push("property_status = ?");
        values.push(status);
      }
      let filterQuery =
        filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
      pool.query(
        `SELECT COUNT(*) AS total_count FROM properties ${filterQuery}`,
        values,
        (err, countResults) => {
          if (err) {
            console.error("❌ Error fetching total count:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          const total_count = countResults[0].total_count;
          const total_pages = Math.ceil(total_count / limit);
          if (page > total_pages) {
            return res.status(200).json({
              total_count,
              total_pages,
              current_page: page,
              properties: [],
              message: "No more items left",
            });
          }
          pool.query(
            `SELECT * FROM properties ${filterQuery} ORDER BY created_date DESC LIMIT ? OFFSET ?`,
            [...values, limit, offset],
            (err, results) => {
              if (err) {
                console.error("❌ Error fetching properties:", err);
                return res.status(500).json({ error: "Database query failed" });
              }
              res.status(200).json({
                total_count,
                total_pages,
                current_page: page,
                properties: results,
              });
            }
          );
        }
      );
    } catch (error) {
      console.error("❌ Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  updateStatus: (req, res) => {
    const { unique_property_id } = req.query;
  },
  updateListing: (req, res) => {},
  deleteListing: (req, res) => {},
};
