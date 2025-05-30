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
      return res.status(200).json({
        status: "error",
        message: "User id is required, please login and try again",
      });
    }

    const updated_date = moment().format("YYYY-MM-DD"); // only date

    if (unique_property_id) {
      pool.query(
        "SELECT * FROM properties WHERE user_id = ? AND unique_property_id = ?",
        [user_id, unique_property_id],
        (err, rows) => {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ status: "error", message: err.message });
          }

          const property = rows[0];

          if (!property) {
            return res.status(200).json({
              status: "error",
              message: "Property not found",
            });
          }

          pool.query(
            `UPDATE properties SET 
              property_in = ?, 
              property_for = ?, 
              transaction_type = ?, 
              user_type = ?, 
              updated_date = ? 
            WHERE id = ?`,
            [
              property_in,
              property_for,
              transaction_type,
              user_type,
              updated_date,
              property.id,
            ],
            (err2) => {
              if (err2) {
                console.error(err2);
                return res
                  .status(500)
                  .json({ status: "error", message: err2.message });
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
        }
      );
    } else {
      const uniquepropertyid =
        "MO-" + Math.floor(100000 + Math.random() * 900000);

      pool.query(
        `INSERT INTO properties (
          user_id, unique_property_id, property_in, property_for, 
          transaction_type, user_type, updated_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          uniquepropertyid,
          property_in,
          property_for,
          transaction_type,
          user_type,
          updated_date,
        ],
        (err3, insertResult) => {
          if (err3) {
            console.error(err3);
            return res
              .status(500)
              .json({ status: "error", message: err3.message });
          }

          return res.status(200).json({
            status: "success",
            message: "Property details added successfully",
            property: {
              property_id: insertResult.insertId,
              unique_property_id: uniquepropertyid,
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
  },
  addPropertyDetails: (req, res) => {},
  addAddressDetails: (req, res) => {},
  getPropertyDetails: (req, res) => {},
};
