const pool = require("../config/db");
const moment = require("moment");
function shuffleProperties(properties, batchSize = 5) {
  if (properties.length <= 1) {
    return properties;
  }
  const firstNameMap = new Map();
  for (const prop of properties) {
    const firstName = getFirstName(prop.property_name);
    if (!firstNameMap.has(firstName)) {
      firstNameMap.set(firstName, []);
    }
    firstNameMap.get(firstName).push(prop);
  }
  if (firstNameMap.size === 1) {
    console.warn(
      "All properties have the same first name. Cannot shuffle to avoid consecutive first names."
    );
    return properties;
  }
  const result = [];
  let availableFirstNames = Array.from(firstNameMap.keys());
  while (result.length < properties.length && availableFirstNames.length > 0) {
    const batch = [];
    const usedFirstNames = new Set();
    for (const firstName of availableFirstNames) {
      if (batch.length >= batchSize) break;
      const props = firstNameMap.get(firstName);
      if (props.length > 0) {
        const prop = props.shift();
        batch.push(prop);
        usedFirstNames.add(firstName);
      }
    }
    for (let i = batch.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [batch[i], batch[j]] = [batch[j], batch[i]];
    }
    if (result.length > 0 && batch.length > 0) {
      const lastFirstName = getFirstName(
        result[result.length - 1].property_name
      );
      const firstBatchFirstName = getFirstName(batch[0].property_name);
      if (lastFirstName === firstBatchFirstName) {
        batch.push(batch.shift());
      }
    }
    result.push(...batch);
    for (const firstName of usedFirstNames) {
      if (firstNameMap.get(firstName).length === 0) {
        firstNameMap.delete(firstName);
      }
    }
    availableFirstNames = Array.from(firstNameMap.keys());
  }
  checkConsecutiveFirstNames(result);
  return result;
}
function getFirstName(propertyName) {
  if (!propertyName || typeof propertyName !== "string") return "";
  return propertyName.trim().split(" ")[0].toLowerCase();
}
function checkConsecutiveFirstNames(properties) {
  let hasConsecutive = false;
  for (let i = 0; i < properties.length - 1; i++) {
    const currentFirstName = getFirstName(properties[i].property_name);
    const nextFirstName = getFirstName(properties[i + 1].property_name);
    if (currentFirstName && currentFirstName === nextFirstName) {
      hasConsecutive = true;
    }
  }
  return hasConsecutive;
}
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
      const query = `
        SELECT 
          p.*, 
          u.name, u.email, u.mobile, u.photo, u.user_type
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.unique_property_id = ?
        LIMIT 1
      `;
      pool.query(query, [unique_property_id], (err, propertyResults) => {
        if (err) {
          console.error("Error fetching property:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (propertyResults.length === 0) {
          return res.status(404).json({ error: "Property not found" });
        }
        const row = propertyResults[0];
        const {
          name,
          email,
          mobile,
          photo,
          user_type,
          updated_date,
          updated_time,
          ...property
        } = row;
        const formattedDate = updated_date            
          ? moment(updated_date).format("YYYY-MM-DD")
          : null;
        const formattedTime = updated_time
          ? moment(updated_time, "HH:mm:ss").format("HH:mm:ss")
          : null;
        const propertyWithUser = {
          ...property,
          unique_property_id,
          updated_date: formattedDate,
          updated_time: formattedTime,
          user: { name, email, mobile, photo, user_type },
        };
        pool.query(
          `SELECT * FROM around_this_property WHERE unique_property_id = ?`,
          [unique_property_id],
          (err2, aroundPlacesResults) => {
            if (err2) {
              console.error("Error fetching around places:", err2);
              return res.status(500).json({ error: "Database query failed" });
            }
            propertyWithUser.around_places = aroundPlacesResults || [];
            res.status(200).json({ property: propertyWithUser });
          }
        );
      });
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
        city,
        page = 1,
        user_id,
        furnished_status,
        from_date,
        to_date,
      } = req.query;
      const conditions = [];
      const values = [];
      if (user_id) {
        conditions.push("p.user_id = ?");
        values.push(user_id);
      }
      if (property_status) {
        conditions.push("p.property_status = ?");
        values.push(property_status);
      }
      if (occupancy) {
        conditions.push("p.occupancy = ?");
        values.push(occupancy);
      }
      if (furnished_status) {
        conditions.push("p.furnished_status = ?");
        values.push(furnished_status);
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
      if (city) {
        conditions.push("p.city_id = ?");
        values.push(city);
      }
      if (from_date) {
        if (!moment(from_date, "YYYY-MM-DD", true).isValid()) {
          return res
            .status(400)
            .json({ error: "Invalid from_date format (use YYYY-MM-DD)" });
        }
        if (to_date) {
          if (!moment(to_date, "YYYY-MM-DD", true).isValid()) {
            return res
              .status(400)
              .json({ error: "Invalid to_date format (use YYYY-MM-DD)" });
          }
          conditions.push("p.updated_date BETWEEN ? AND ?");
          values.push(from_date, to_date);
        } else {
          conditions.push("p.updated_date >= ?");
          values.push(from_date);
        }
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
      const limit = 150;
      const pageNumber = parseInt(page, 10) || 1;
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
          console.error("Count Query Error:", err.message, err.stack);
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
            console.error("Property Fetch Error:", err.message, err.stack);
            return res.status(500).json({ error: "Database query failed" });
          }
          if (!results.length) {
            return res.status(200).json({
              total_count,
              current_page: pageNumber,
              total_pages,
              current_count: 0,
              properties: [],
            });
          }
          const propertyIds = results.map((row) => row.unique_property_id);
          const placeholders = propertyIds.map(() => "?").join(",");
          const enquiryQuery = `
            SELECT unique_property_id, COUNT(*) AS enquiries
            FROM contact_seller
            WHERE unique_property_id IN (${placeholders})
            GROUP BY unique_property_id
          `;
          const favouriteQuery = `
            SELECT unique_property_id, COUNT(*) AS favourites
            FROM favourites
            WHERE unique_property_id IN (${placeholders})
            GROUP BY unique_property_id
          `;
          pool.query(enquiryQuery, propertyIds, (err, enquiryResults) => {
            if (err) {
              console.error("Enquiries Fetch Error:", err.message, err.stack);
              return res
                .status(500)
                .json({ error: "Failed to fetch enquiries" });
            }
            pool.query(favouriteQuery, propertyIds, (err, favouriteResults) => {
              if (err) {
                console.error(
                  "Favourites Fetch Error:",
                  err.message,
                  err.stack
                );
                return res
                  .status(500)
                  .json({ error: "Failed to fetch favourites" });
              }
              const enquiriesMap = Object.fromEntries(
                enquiryResults.map((e) => [e.unique_property_id, e.enquiries])
              );
              const favouritesMap = Object.fromEntries(
                favouriteResults.map((f) => [
                  f.unique_property_id,
                  f.favourites,
                ])
              );
              const properties = results.map((row) => {
                const {
                  name,
                  email,
                  mobile,
                  photo,
                  user_type,
                  updated_date,
                  updated_time,
                  unique_property_id,
                  ...rest
                } = row;
                return {
                  ...rest,
                  unique_property_id,
                  updated_date: updated_date
                    ? moment(updated_date).format("YYYY-MM-DD")
                    : null,
                  updated_time: updated_time
                    ? moment(updated_time, "HH:mm:ss").format("HH:mm:ss")
                    : null,
                  user: { name, email, mobile, photo, user_type },
                  enquiries: enquiriesMap[unique_property_id] || 0,
                  favourites: favouritesMap[unique_property_id] || 0,
                };
              });
              const shuffled = shuffleProperties(properties, 10);
              res.status(200).json({
                total_count,
                current_page: pageNumber,
                total_pages,
                current_count: shuffled.length,
                properties: shuffled,
              });
            });
          });
        });
      });
    } catch (error) {
      console.error("Unexpected Server Error:", error.message, error.stack);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getAllListingsByType: async (req, res) => {
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
        city,
        page = 1,
        user_id,
      } = req.query;
      const conditions = [];
      const values = [];
      if (user_id) {
        conditions.push("p.user_id = ?");
        values.push(user_id);
      }
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
      if (city) {
        conditions.push("p.city_id = ?");
        values.push(city);
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
      const limit = 50;
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
          const propertyIds = results.map((row) => row.unique_property_id);
          if (propertyIds.length === 0) {
            return res.status(200).json({
              total_count,
              current_page: pageNumber,
              total_pages,
              current_count: 0,
              properties: [],
            });
          }
          const placeholders = propertyIds.map(() => "?").join(",");
          const enquiryQuery = `
            SELECT unique_property_id, COUNT(*) AS enquiries
            FROM contact_seller
            WHERE unique_property_id IN (${placeholders})
            GROUP BY unique_property_id
          `;
          const favouriteQuery = `
            SELECT unique_property_id, COUNT(*) AS favourites
            FROM favourites
            WHERE unique_property_id IN (${placeholders})
            GROUP BY unique_property_id
          `;
          pool.query(enquiryQuery, propertyIds, (err, enquiryResults) => {
            if (err) {
              console.error("Enquiries Fetch Error:", err);
              return res
                .status(500)
                .json({ error: "Failed to fetch enquiries" });
            }
            pool.query(favouriteQuery, propertyIds, (err, favouriteResults) => {
              if (err) {
                console.error("Favourites Fetch Error:", err);
                return res
                  .status(500)
                  .json({ error: "Failed to fetch favourites" });
              }
              const enquiriesMap = Object.fromEntries(
                enquiryResults.map((e) => [e.unique_property_id, e.enquiries])
              );
              const favouritesMap = Object.fromEntries(
                favouriteResults.map((f) => [
                  f.unique_property_id,
                  f.favourites,
                ])
              );
              const properties = results.map((row) => {
                const {
                  name,
                  email,
                  mobile,
                  photo,
                  user_type,
                  updated_date,
                  updated_time,
                  unique_property_id,
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
                  unique_property_id,
                  updated_date: formattedDate,
                  updated_time: formattedTime,
                  user: { name, email, mobile, photo, user_type },
                  enquiries: enquiriesMap[unique_property_id] || 0,
                  favourites: favouritesMap[unique_property_id] || 0,
                };
              });
              res.status(200).json({
                total_count,
                current_page: pageNumber,
                total_pages,
                current_count: properties.length,
                properties: properties,
              });
            });
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
      const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      };
      const getFirstWord = (name) => {
        return name?.split(" ")[0]?.toLowerCase() || "";
      };
      const eightDaysAgo = moment()
        .subtract(8, "days")
        .format("YYYY-MM-DD HH:mm:ss");
      let newPropertiesQuery = `SELECT * FROM properties WHERE property_status = 1 AND sub_type != "PLOT" AND updated_date >= ?`;
      let queryParams = [eightDaysAgo];
      if (property_for) {
        newPropertiesQuery += ` AND property_for = ?`;
        queryParams.push(property_for);
      }
      if (property_for !== "Rent") {
        newPropertiesQuery += ` AND sub_type = "Apartment"`;
      }
      newPropertiesQuery += ` ORDER BY id DESC`;
      pool.query(newPropertiesQuery, queryParams, (err, newResults) => {
        if (err) {
          console.error("Database query failed for new properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        let uniqueNewProperties = [];
        if (newResults.length > 0) {
          const shuffledNewProperties = shuffleArray([...newResults]);
          const seenFirstWords = new Set();
          for (const property of shuffledNewProperties) {
            const firstWord = getFirstWord(property.property_name);
            if (!seenFirstWords.has(firstWord)) {
              seenFirstWords.add(firstWord);
              uniqueNewProperties.push(property);
            }
            if (uniqueNewProperties.length >= 15) break;
          }
        }
        if (uniqueNewProperties.length >= 10) {
          const finalProperties = uniqueNewProperties
            .sort(() => Math.random() - 0.5)
            .slice(0, 10);
          return res.status(200).json({
            count: finalProperties.length,
            properties: finalProperties,
          });
        }
        const remainingCount = 10 - uniqueNewProperties.length;
        let topPropertiesQuery = `SELECT * FROM properties WHERE property_status = 1 AND sub_type != "PLOT"`;
        let topQueryParams = [];
        if (property_for) {
          topPropertiesQuery += ` AND property_for = ?`;
          topQueryParams.push(property_for);
        }
        if (property_for !== "Rent") {
          topPropertiesQuery += ` AND sub_type = "Apartment"`;
        }
        if (uniqueNewProperties.length > 0) {
          const selectedIds = uniqueNewProperties.map((p) => p.id).join(",");
          topPropertiesQuery += ` AND id NOT IN (${selectedIds})`;
        }
        topPropertiesQuery += ` ORDER BY id DESC LIMIT ?`;
        topQueryParams.push(remainingCount + 5);
        pool.query(topPropertiesQuery, topQueryParams, (err, topResults) => {
          if (err) {
            console.error("Database query failed for top properties:", err);
            return res.status(500).json({ error: "Database query failed" });
          }
          let uniqueTopProperties = [];
          if (topResults.length > 0) {
            const shuffledTopProperties = shuffleArray([...topResults]);
            const seenFirstWords = new Set(
              uniqueNewProperties.map((p) => getFirstWord(p.property_name))
            );
            for (const property of shuffledTopProperties) {
              const firstWord = getFirstWord(property.property_name);
              if (!seenFirstWords.has(firstWord)) {
                seenFirstWords.add(firstWord);
                uniqueTopProperties.push(property);
              }
              if (uniqueTopProperties.length >= remainingCount) break;
            }
          }
          const combinedProperties = [
            ...uniqueNewProperties,
            ...uniqueTopProperties,
          ].slice(0, 10);
          if (combinedProperties.length < 10) {
            const stillNeeded = 10 - combinedProperties.length;
            let fallbackQuery = `SELECT * FROM properties WHERE property_status = 1 AND sub_type != "PLOT"`;
            let fallbackParams = [];
            if (property_for) {
              fallbackQuery += ` AND property_for = ?`;
              fallbackParams.push(property_for);
            }
            const allSelectedIds = combinedProperties
              .map((p) => p.id)
              .join(",");
            if (allSelectedIds) {
              fallbackQuery += ` AND id NOT IN (${allSelectedIds})`;
            }
            fallbackQuery += ` ORDER BY id DESC LIMIT ?`;
            fallbackParams.push(stillNeeded);
            pool.query(
              fallbackQuery,
              fallbackParams,
              (err, fallbackResults) => {
                if (err) {
                  console.error(
                    "Database query failed for fallback properties:",
                    err
                  );
                  return res
                    .status(500)
                    .json({ error: "Database query failed" });
                }
                const finalProperties = [
                  ...combinedProperties,
                  ...fallbackResults.slice(0, stillNeeded),
                ].sort(() => Math.random() - 0.5);
                return res.status(200).json({
                  count: finalProperties.length,
                  properties: finalProperties,
                });
              }
            );
          } else {
            const finalProperties = combinedProperties.sort(
              () => Math.random() - 0.5
            );
            return res.status(200).json({
              count: finalProperties.length,
              properties: finalProperties,
            });
          }
        });
      });
    } catch (error) {
      console.error("Error fetching latest properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getPropertiesByUserID: async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "Missing user_id parameter" });
    }
    try {
      const propertyQuery = `
        SELECT * FROM properties 
        WHERE user_id = ? AND property_name IS NOT NULL 
        ORDER BY id DESC
      `;
      const [properties] = await pool.promise().query(propertyQuery, [user_id]);
      if (!properties.length) {
        return res.status(200).json({ count: 0, properties: [] });
      }
      const propertyActivities = await Promise.all(
        properties.map(async (property) => {
          const activityQuery = `
            SELECT 
              cs.*, 
              u.id AS user_id, 
              u.name AS user_name, 
              u.email AS user_email, 
              u.mobile AS user_mobile,
              p.property_name AS property_name
            FROM contact_seller cs
            LEFT JOIN users u ON cs.user_id = u.id
            LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
            WHERE cs.unique_property_id = ?
            ORDER BY cs.id DESC
          `;
          const [activityResults] = await pool
            .promise()
            .query(activityQuery, [property.unique_property_id]);
          const formattedActivity = activityResults.map((row) => {
            const {
              user_id,
              user_name,
              user_email,
              user_mobile,
              property_name,
              ...contact
            } = row;
            return {
              ...contact,
              property_name,
              userDetails: {
                id: user_id,
                name: user_name,
                email: user_email,
                mobile: user_mobile,
              },
            };
          });
          return {
            ...property,
            totalContacted: formattedActivity.length,
            activity: formattedActivity,
          };
        })
      );
      return res.status(200).json({
        count: propertyActivities.length,
        properties: propertyActivities,
      });
    } catch (error) {
      console.error("Error fetching properties with activity:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getRandomPropertiesAds: (req, res) => {
    try {
      const query = `SELECT * FROM properties 
WHERE property_status = 1 
  AND sub_type IN ('Apartment', 'PLOT') 
ORDER BY id DESC 
LIMIT 15;
`;
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
      ORDER BY sp.id DESC
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
  getPropertyActivity: (req, res) => {
    const { property_id } = req.query;
    if (!property_id) {
      return res.status(400).json({ error: "property_id is required" });
    }
    const query = `
      SELECT 
        cs.*, 
        u.id AS user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        u.mobile AS user_mobile,
        p.property_name AS property_name
      FROM contact_seller cs
      LEFT JOIN users u ON cs.user_id = u.id
      LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
      WHERE cs.unique_property_id = ?
      ORDER BY cs.id DESC
    `;
    pool.query(query, [property_id], (err, results) => {
      if (err) {
        console.error(
          "Error fetching contact sellers with user and property details:",
          err
        );
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "No contact sellers found for this property" });
      }
      const formattedResults = results.map((row) => {
        const {
          user_id,
          user_name,
          user_email,
          user_mobile,
          property_name,
          ...contact
        } = row;
        return {
          ...contact,
          property_name,
          userDetails: {
            id: user_id,
            name: user_name,
            email: user_email,
            mobile: user_mobile,
          },
        };
      });
      return res.status(200).json({ results: formattedResults });
    });
  },
  propertyViewed: (req, res) => {
    const { user_id, property_id, name, mobile, email, property_name } =
      req.body;
    if (
      !user_id ||
      !property_id ||
      !name ||
      !mobile ||
      !email ||
      !property_name
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const created_date = moment().format("YYYY-MM-DD HH:mm:ss");
    const query = `
    INSERT INTO property_views (user_id, property_id, name, mobile, email, created_date, property_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
      user_id,
      property_id,
      name,
      mobile,
      email,
      created_date,
      property_name,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting into property_views:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(201).json({
        message: "Property view recorded successfully",
        insertedId: result.insertId,
      });
    });
  },
  getAllPropertyViews: (req, res) => {
    const { property_id } = req.query;
    let query;
    const params = [];
    if (property_id) {
      query = `
        SELECT 
          pv.*, 
          p.google_address,
          p.city_id
        FROM property_views pv
        LEFT JOIN properties p ON pv.property_id = p.unique_property_id
        WHERE pv.property_id = ? 
        ORDER BY pv.id DESC
      `;
      params.push(property_id);
    } else {
      query = `
        SELECT 
          pv.property_id, 
          pv.property_name,
          p.google_address,
          p.city_id,
          COUNT(*) AS view_count
        FROM property_views pv
        LEFT JOIN properties p ON pv.property_id = p.unique_property_id
        GROUP BY pv.property_id, pv.property_name, p.google_address, p.city_id
        ORDER BY view_count DESC
      `;
    }
    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching property views:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.status(200).json({
        count: results.length,
        views: results,
      });
    });
  },
};
