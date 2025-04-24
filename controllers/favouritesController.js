const pool = require("../config/db");
const moment = require("moment");
module.exports = {
  getAllFavourites: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: "User ID required" });

    const query = `
    SELECT * 
    FROM favourites 
    WHERE User_user_id = ?
    ORDER BY id DESC
  `;

    pool.query(query, [user_id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(200).json({ favourites: results });
    });
  },

  postIntrest: (req, res) => {
    const { User_user_id, unique_property_id, status } = req.body;

    if (!User_user_id || !unique_property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID required" });
    }

    if (status === 1) {
      const deleteQuery = `DELETE FROM favourites WHERE User_user_id = ? AND unique_property_id = ?`;
      pool.query(
        deleteQuery,
        [User_user_id, unique_property_id],
        (err, result) => {
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
        }
      );
    } else {
      const searched_on_date = moment().format("YYYY-MM-DD");
      const searched_on_time = moment().format("HH:mm:ss");

      // Remove status, updated_date, updated_on, and user
      const { status, updated_date, updated_on, user, ...filteredBody } =
        req.body;

      const data = {
        ...filteredBody,
        searched_on_date,
        searched_on_time,
      };

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => "?").join(", ");

      const insertQuery = `INSERT INTO favourites (${columns.join(
        ", "
      )}) VALUES (${placeholders})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Error inserting favourite:", err);
          return res.status(500).json({ error: "Database error" });
        }

        return res
          .status(200)
          .json({ message: "Favourite added successfully" });
      });
    }
  },

  deleteIntrest: (req, res) => {
    const { user_id, unique_property_id } = req.body;
    if (!user_id || !unique_property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID required" });
    }
    const checkQuery = `SELECT * FROM favourites WHERE User_user_id = ? AND unique_property_id = ?`;
    pool.query(checkQuery, [user_id, unique_property_id], (err, results) => {
      if (err) {
        console.error("Error checking favourite:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Favourite not found" });
      }
      const deleteQuery = `DELETE FROM favourites WHERE User_user_id = ? AND unique_property_id = ?`;
      pool.query(deleteQuery, [user_id, unique_property_id], (err, result) => {
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
