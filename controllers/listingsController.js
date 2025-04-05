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
  getAllPropertiesByType: (req, res) => {
    try {
      const { property_status, property_for, property_in } = req.query;
      let conditions = [];
      let values = [];

      if (property_status) {
        conditions.push("property_status = ?");
        values.push(property_status);
      }
      if (property_for) {
        conditions.push("property_for = ?");
        values.push(property_for);
      }
      if (property_in) {
        conditions.push("property_in = ?");
        values.push(property_in);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const countQuery = `SELECT COUNT(*) AS total_count FROM properties ${whereClause}`;
      pool.query(countQuery, values, (err, countResults) => {
        if (err) {
          console.error("Error fetching total count:", err);
          return res.status(500).json({ error: "Database query failed" });
        }

        const total_count = countResults[0].total_count;
        const query = `SELECT * FROM properties ${whereClause} ORDER BY created_date DESC`;

        pool.query(query, values, async (err, results) => {
          if (err) {
            console.error("Error fetching properties:", err);
            return res.status(500).json({ error: "Database query failed" });
          }

          try {
            const propertiesWithUsers = await Promise.all(
              results.map((property) => {
                return new Promise((resolve, reject) => {
                  const userQuery =
                    "SELECT name, email, mobile, photo, user_type FROM users WHERE id = ?";
                  pool.query(
                    userQuery,
                    [property.user_id],
                    (err, userResults) => {
                      if (err) return reject(err);
                      const user = userResults[0] || null;
                      resolve({ ...property, user });
                    }
                  );
                });
              })
            );

            res.status(200).json({
              total_count,
              properties: propertiesWithUsers,
            });
          } catch (userErr) {
            console.error("Error fetching user data:", userErr);
            return res.status(500).json({ error: "Failed to fetch user data" });
          }
        });
      });
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
            `SELECT * FROM properties ORDER BY id DESC LIMIT ? OFFSET ?`,
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
            `SELECT * FROM properties ${filterQuery} ORDER BY created_date DESC LIMIT ? OFFSET ?`,
            [...values, limit, offset],
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
  updateStatus: (req, res) => {
    const { property_status, unique_property_id } = req.body;
    if (!unique_property_id || !property_status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    pool.query(
      `UPDATE properties SET property_status = ? WHERE unique_property_id = ?`,
      [property_status, unique_property_id],
      (err, result) => {
        if (err) {
          console.error("Error updating status:", err);
          return res.status(500).json({ error: "Database update failed" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Property not found" });
        }
        res.status(200).json({ message: "Status updated successfully" });
      }
    );
  },
  updateListing: (req, res) => {
    const { unique_property_id } = req.query;
    const updatedFields = req.body;
    if (!unique_property_id || Object.keys(updatedFields).length === 0) {
      return res
        .status(400)
        .json({ error: "Missing unique_property_id or update fields" });
    }
    const updateQuery = `
        UPDATE properties 
        SET ${Object.keys(updatedFields)
          .map((field) => `${field} = ?`)
          .join(", ")}
        WHERE unique_property_id = ?`;
    const values = [...Object.values(updatedFields), unique_property_id];
    pool.query(updateQuery, values, (err, result) => {
      if (err) {
        console.error("Error updating listing:", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Property not found" });
      }
      res
        .status(200)
        .json({ message: "Property listing updated successfully" });
    });
  },
  deleteListing: (req, res) => {
    const { unique_property_id } = req.query;
    if (!unique_property_id) {
      return res.status(400).json({ error: "Missing unique_property_id" });
    }
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting DB connection:", err);
        return res.status(500).json({ error: "Database connection failed" });
      }
      connection.beginTransaction((transactionErr) => {
        if (transactionErr) {
          console.error("Transaction error:", transactionErr);
          return res.status(500).json({ error: "Transaction failed" });
        }
        connection.query(
          `SELECT * FROM properties WHERE unique_property_id = ?`,
          [unique_property_id],
          (err, results) => {
            if (err) {
              console.error("Error finding property:", err);
              connection.rollback(() => connection.release());
              return res.status(500).json({ error: "Database query failed" });
            }
            if (results.length === 0) {
              connection.rollback(() => connection.release());
              return res.status(404).json({ error: "Property not found" });
            }
            const { unique_property_id, property_name } = results[0];
            connection.query(
              `INSERT INTO deletedproperties SELECT * FROM properties WHERE unique_property_id = ?`,
              [unique_property_id],
              (insertErr) => {
                if (insertErr) {
                  console.error(
                    "Error inserting into deletedproperties:",
                    insertErr
                  );
                  connection.rollback(() => connection.release());
                  return res
                    .status(500)
                    .json({ error: "Failed to archive property" });
                }
                connection.query(
                  `DELETE FROM properties WHERE unique_property_id = ?`,
                  [unique_property_id],
                  (deleteErr) => {
                    if (deleteErr) {
                      console.error("Error deleting property:", deleteErr);
                      connection.rollback(() => connection.release());
                      return res
                        .status(500)
                        .json({ error: "Failed to delete property" });
                    }
                    connection.commit((commitErr) => {
                      if (commitErr) {
                        console.error("Commit failed:", commitErr);
                        connection.rollback(() => connection.release());
                        return res
                          .status(500)
                          .json({ error: "Transaction commit failed" });
                      }
                      connection.release();
                      res.status(200).json({
                        message: "Property deleted and archived successfully",
                        unique_property_id,
                        property_name,
                      });
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  },
  getAllLeadsByFilter: async (req, res) => {
    const { property_for } = req.query;
    try {
      const query = `
            SELECT sp.id, sp.property_id, sp.user_id, sp.name, sp.mobile, sp.email, 
                   sp.searched_on_date, sp.searched_on_time, sp.interested_status, 
                   sp.property_user_id, sp.searched_filter_desc, sp.shedule_date, 
                   sp.shedule_time, sp.view_status, 
                   COALESCE(p.property_for, 'Unknown') AS property_for
            FROM searched_properties sp
            LEFT JOIN properties p ON sp.property_id = p.unique_property_id
            ${property_for ? "WHERE p.property_for = ?" : ""}
        `;
      const values = property_for ? [property_for] : [];
      const [result] = await pool.promise().query(query, values);
      if (result.length === 0) {
        return res.status(404).json({
          message: `No results found for: ${property_for || "All"}`,
          count: 0,
          data: [],
        });
      }
      res.status(200).json({
        message: "Data fetched successfully",
        count: result.length,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};
