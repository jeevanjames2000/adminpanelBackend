const pool = require("../config/db");
const moment = require("moment");
module.exports = {
  addBasicdetails: (req, res) => {
    const {
      property_in,
      property_for,
      transaction_type,
      user_id,
      unique_property_id,
      user_type,
    } = req.body;
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "User id is required, please login and try again",
      });
    }
    const updated_date = moment().format("YYYY-MM-DD");
    const checkPropertyQuery = `
      SELECT * FROM properties WHERE user_id = ? AND unique_property_id = ?
    `;
    const updatePropertyQuery = `
      UPDATE properties SET 
        property_in = ?, 
        property_for = ?, 
        transaction_type = ?, 
        user_type = ?, 
        updated_date = ? 
      WHERE id = ?
    `;
    const insertPropertyQuery = `
      INSERT INTO properties (
        user_id, unique_property_id, property_in, property_for, 
        transaction_type, user_type, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const uniqueId =
      unique_property_id || "MO-" + Math.floor(100000 + Math.random() * 900000);
    pool.query(checkPropertyQuery, [user_id, uniqueId], (err, rows) => {
      if (err) {
        console.error("Check property error:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }
      const property = rows[0];
      if (property) {
        pool.query(
          updatePropertyQuery,
          [
            property_in,
            property_for,
            transaction_type,
            user_type,
            updated_date,
            property.id,
          ],
          (updateErr) => {
            if (updateErr) {
              console.error("Update property error:", updateErr);
              return res
                .status(500)
                .json({ status: "error", message: updateErr.message });
            }
            return res.status(200).json({
              status: "success",
              message: "Property details updated successfully",
              property: {
                property_id: property.id,
                unique_property_id: property.unique_property_id,
                property_in,
                property_for,
                transaction_type,
                user_type,
                updated_date,
              },
            });
          }
        );
      } else {
        pool.query(
          insertPropertyQuery,
          [
            user_id,
            uniqueId,
            property_in,
            property_for,
            transaction_type,
            user_type,
            updated_date,
          ],
          (insertErr, insertResult) => {
            if (insertErr) {
              console.error("Insert property error:", insertErr);
              return res
                .status(500)
                .json({ status: "error", message: insertErr.message });
            }
            return res.status(200).json({
              status: "success",
              message: "Property details added successfully",
              property: {
                property_id: insertResult.insertId,
                unique_property_id: uniqueId,
                property_in,
                property_for,
                transaction_type,
                user_type,
                updated_date,
              },
            });
          }
        );
      }
    });
  },
  addPropertyDetails: (req, res) => {},
  addAddressDetails: (req, res) => {},
  getPropertyDetails: (req, res) => {},
};
