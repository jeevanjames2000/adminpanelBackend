const pool = require("../config/db");
const moment = require("moment");
module.exports = {
  getAllFavourites: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: "User ID required" });
    const query = `
      SELECT * 
      FROM favourites 
      ORDER BY id DESC
    `;
    pool.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching favourites:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(200).json({ favourites: results });
    });
  },
  postIntrest: (req, res) => {
    const {
      user_id,
      property_id,
      property_name,
      property_image,
      property_cost,
      location,
      status,
    } = req.body;

    if (!user_id || !property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID required" });
    }

    if (status === "false") {
      const deleteQuery = `DELETE FROM favourites WHERE user_id = ? AND property_id = ?`;
      pool.query(deleteQuery, [user_id, property_id], (err, result) => {
        if (err) {
          console.error("Error deleting favourite:", err);
          return res.status(500).json({ error: "Database error" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Favourite not found" });
        }

        return res
          .status(200)
          .json({ message: "Favourite removed successfully" });
      });
    } else {
      // Insert favourite if status is true
      const created_date = moment().format("YYYY-MM-DD");
      const currentTime = moment().format("HH:mm:ss");
      const created_on = moment().format("YYYY-MM-DD HH:mm:ss");

      const insertQuery = `
      INSERT INTO favourites 
      (user_id, property_id, property_name, property_image, property_cost, location, created_date, created_time, created_on) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      pool.query(
        insertQuery,
        [
          user_id,
          property_id,
          property_name || null,
          property_image || null,
          property_cost || null,
          location || null,
          created_date,
          currentTime,
          created_on,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting favourite:", err);
            return res.status(500).json({ error: "Database error" });
          }

          return res
            .status(200)
            .json({ message: "Favourite added successfully" });
        }
      );
    }
  },
  deleteIntrest: (req, res) => {
    const { user_id, property_id } = req.body;
    if (!user_id || !property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID required" });
    }
    const checkQuery = `SELECT * FROM favourites WHERE user_id = ? AND property_id = ?`;
    pool.query(checkQuery, [user_id, property_id], (err, results) => {
      if (err) {
        console.error("Error checking favourite:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Favourite not found" });
      }
      const deleteQuery = `DELETE FROM favourites WHERE user_id = ? AND property_id = ?`;
      pool.query(deleteQuery, [user_id, property_id], (err, result) => {
        if (err) {
          console.error("Error deleting favourite:", err);
          return res.status(500).json({ error: "Database error" });
        }
        return res
          .status(200)
          .json({ message: "Favourite removed successfully" });
      });
    });
  },
};
