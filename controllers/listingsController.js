const pool = require("../config/db");
const moment = require("moment");
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
            `SELECT * FROM properties WHERE property_status=1 ORDER BY id DESC`,
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
  getSingleProperty: async (req, res) => {
    const { unique_property_id } = req.query;

    if (!unique_property_id) {
      return res.status(400).json({ error: "unique_property_id is required" });
    }
    try {
      pool.query(
        `SELECT * FROM properties WHERE unique_property_id = ? LIMIT 1`,
        [unique_property_id],
        (err, results) => {
          if (err) {
            console.error("Error fetching property:", err);
            return res.status(500).json({ error: "Database query failed" });
          }

          if (results.length === 0) {
            return res.status(404).json({ error: "Property not found" });
          }

          res.status(200).json({ property: results[0] });
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getAllPropertiesByType: async (req, res) => {
    try {
      const {
        property_status,
        occupancy,
        property_for,
        property_in,
        property_cost,
        sub_type,
        bedrooms,
        priceFilter,
        search = "",
        page = 1,
      } = req.query;
      const conditions = [
        "p.property_name IS NOT NULL",
        "p.description IS NOT NULL",
      ];
      const values = [];
      if (property_status) {
        conditions.push("p.property_status = ?");
        values.push(property_status);
      }
      if (occupancy) {
        conditions.push("p.occupancy = ?");
        values.push(occupancy);
      }
      if (property_cost) {
        const costStr = String(property_cost).trim();
        if (costStr === "50") {
          conditions.push("CAST(p.property_cost AS DECIMAL) BETWEEN ? AND ?");
          values.push(10000, 5000000);
        } else if (costStr === "50-75") {
          conditions.push("CAST(p.property_cost AS DECIMAL) BETWEEN ? AND ?");
          values.push(5000000, 7500000);
        } else if (costStr === "75" || costStr === "75+") {
          conditions.push("CAST(p.property_cost AS DECIMAL) > ?");
          values.push(7500000);
        }
      }
      if (sub_type) {
        conditions.push("p.sub_type = ?");
        values.push(sub_type);
      }
      if (bedrooms) {
        conditions.push("p.bedrooms = ?");
        values.push(bedrooms);
      }
      if (property_for) {
        conditions.push("p.property_for = ?");
        values.push(property_for);
      }
      if (property_in) {
        conditions.push("p.property_in = ?");
        values.push(property_in);
      }
      let searchClause = "";
      const searchValues = [];
      if (search) {
        const searchLower = `%${search.toLowerCase()}%`;
        const searchStart = `${search.toLowerCase()}%`;
        searchClause = `
        AND (
          LOWER(p.unique_property_id) LIKE ? OR
          LOWER(p.property_name) LIKE ? OR
          LOWER(p.google_address) LIKE ? OR
          LOWER(p.location_id) LIKE ? OR
          LOWER(u.name) LIKE ? OR
          u.mobile LIKE ?
        )
      `;
        searchValues.push(
          searchLower,
          searchLower,
          searchLower,
          searchLower,
          searchStart,
          searchLower
        );
      }
      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      let orderBy = "ORDER BY p.id DESC";
      if (priceFilter === "Price: Low to High") {
        orderBy = "ORDER BY CAST(p.property_cost AS DECIMAL) ASC";
      } else if (priceFilter === "Price: High to Low") {
        orderBy = "ORDER BY CAST(p.property_cost AS DECIMAL) DESC";
      }
      const limit = 15;
      const pageNumber = parseInt(page) || 1;
      const offset = (pageNumber - 1) * limit;
      const countQuery = `
      SELECT COUNT(*) AS total_count
      FROM properties p
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      ${searchClause}
    `;
      const countParams = [...values, ...searchValues];
      pool.query(countQuery, countParams, (err, countResults) => {
        if (err) {
          console.error("Count Query Error:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        const total_count = countResults[0].total_count;
        const total_pages = Math.ceil(total_count / limit);
        const dataQuery = `
        SELECT p.*, u.name, u.email, u.mobile, u.photo, u.user_type
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
        ${searchClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `;
        const finalParams = [...values, ...searchValues, limit, offset];
        pool.query(dataQuery, finalParams, (err, results) => {
          if (err) {
            console.error("Property Fetch Error:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          const properties = results.map((row) => {
            const {
              name,
              email,
              mobile,
              photo,
              user_type,
              updated_date,
              updated_time,
              ...rest
            } = row;

            const formattedDate = updated_date
              ? moment(updated_date).format("YYYY-MM-DD")
              : null;
            const formattedTime = updated_time
              ? moment(updated_time, "HH:mm:ss").format("HH:mm:ss")
              : null;

            return {
              ...rest,
              updated_date: formattedDate,
              updated_time: formattedTime,
              user: { name, email, mobile, photo, user_type },
            };
          });

          res.status(200).json({
            total_count,
            current_page: pageNumber,
            total_pages,
            current_count: properties.length,
            properties,
          });
        });
      });
    } catch (error) {
      console.error("Unexpected Server Error:", error);
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

    const istDate = moment().format("YYYY-MM-DD");
    const istTime = moment().format("HH:mm:ss");

    pool.query(
      `UPDATE properties
     SET property_status = ?, 
         updated_date = ?, 
         updated_time = ? 
     WHERE unique_property_id = ?`,
      [property_status, istDate, istTime, unique_property_id],
      (err, result) => {
        if (err) {
          console.error("Error updating status:", err);
          return res.status(500).json({ error: "Database update failed" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Property not found" });
        }
        res
          .status(200)
          .json({ message: "Status and IST timestamp updated successfully" });
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
    const setFields = Object.keys(updatedFields)
      .map((field) => `${field} = ?`)
      .join(", ");
    const updateQuery = `
    UPDATE properties 
    SET ${setFields}, updated_date = CURDATE(), updated_time = CURTIME()
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
      res.status(200).json({
        message: "Property listing and timestamp updated successfully",
      });
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
  getAllFloorPlans: async (req, res) => {
    try {
      const { unique_property_id } = req.params;
      if (!unique_property_id) {
        return res
          .status(400)
          .json({ error: "unique_property_id is required" });
      }
      const query = `
      SELECT * FROM properties_floorplans_gallery 
      WHERE property_id = ?
    `;
      pool.query(query, [unique_property_id], (err, results) => {
        if (err) {
          console.error("Error fetching floor plans:", err);
          return res.status(500).json({ error: "Internal server error" });
        }
        return res.status(200).json(results);
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  getLatestProperties: async (req, res) => {
    const { property_for } = req.query;
    try {
      let query = `SELECT * FROM properties WHERE property_status = 1`;
      let queryParams = [];
      if (property_for) {
        query += ` AND property_for = ?`;
        queryParams.push(property_for);
      }
      query += ` ORDER BY id DESC LIMIT 5`;
      pool.query(query, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        res.status(200).json({
          count: results.length,
          properties: results,
        });
      });
    } catch (error) {
      console.error("Error fetching latest properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getPropertiesByUserID: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }
    try {
      const query = `SELECT * FROM properties WHERE user_id = ? ORDER BY id ASC LIMIT 10`;
      const queryParams = [user_id];
      pool.query(query, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        res.status(200).json({
          count: results.length,
          properties: results,
        });
      });
    } catch (error) {
      console.error("Error fetching properties by user ID:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getRandomPropertiesAds: (req, res) => {
    try {
      const query = `SELECT * FROM properties WHERE property_status = 1 ORDER BY id DESC LIMIT 15`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        res.status(200).json({
          results: selected,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getBestDeals: (req, res) => {
    try {
      const query = `SELECT * FROM properties WHERE other_info = 'best deal' ORDER BY id DESC`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        res.status(200).json({
          results: shuffled,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getBestMeetOwner: (req, res) => {
    try {
      const query = `SELECT * FROM properties WHERE other_info = 'best meetowner' ORDER BY id DESC`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        res.status(200).json({
          results: selected,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getRecomendedSellers: (req, res) => {
    try {
      const query = `SELECT * FROM users WHERE user_type = 4  LIMIT 10`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching sellers:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No sellers found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        res.status(200).json({ results });
      });
    } catch (error) {
      console.error("Error fetching recommended sellers:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getAllLeadsByFilter: async (req, res) => {
    const { property_for, search = "" } = req.query;
    try {
      const query = `
      SELECT 
        sp.id, sp.property_id, sp.user_id, sp.name, sp.mobile, sp.email, 
        sp.searched_on_date, sp.searched_on_time, sp.interested_status, 
        sp.property_user_id, sp.searched_filter_desc, sp.shedule_date, 
        sp.shedule_time, sp.view_status, 
        COALESCE(p.property_for, 'Unknown') AS property_for,
        p.property_name,

        -- Owner Details
        u.id AS owner_user_id, u.name AS owner_name, u.mobile AS owner_mobile, u.user_type AS owner_type,
        u.email AS owner_email, u.photo AS owner_photo

      FROM searched_properties sp
      LEFT JOIN properties p ON sp.property_id = p.unique_property_id
      LEFT JOIN users u ON p.user_id = u.id
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
  getMeetOwnerExclusive: (req, res) => {
    try {
      const query = `SELECT * FROM properties WHERE other_info = 'meetowner exclusive' ORDER BY id ASC`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        res.status(200).json({
          results: shuffled,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getMostPropertiesSeller: (req, res) => {
    try {
      const query = `
      SELECT u.*, COUNT(p.id) AS property_count
      FROM users u
      JOIN properties p ON u.id = p.user_id
      GROUP BY u.id
      ORDER BY property_count DESC
      LIMIT 10
    `;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching top sellers:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No sellers found" });
        }
        res.status(200).json({ sellers: results });
      });
    } catch (error) {
      console.error("Error in getMostPropertiesSeller:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getHighDemandProjects: (req, res) => {
    try {
      const query = `SELECT * FROM properties WHERE other_info = 'best deal' OR other_info = 'best meetowner' ORDER BY id DESC`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        const shuffled = results.sort(() => 0.5 - Math.random());
        res.status(200).json({
          results: shuffled,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getAroundThisProperty: (req, res) => {
    const { id } = req.query;
    try {
      const query = `SELECT * FROM around_this_property WHERE unique_property_id = ?`;
      pool.query(query, [id], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        res.status(200).json({
          results,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  uploadAdsImages:(req,res)=>{
    const {photo,property_id,order}=req.body
  }
};
