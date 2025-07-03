const pool = require("../config/db");
const moment = require("moment");
module.exports = {
  getAllFavourites: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    if (typeof user_id !== "string" || user_id.length > 100) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }
    const query = `
      SELECT 
        f.user_id,
        f.searched_on_date,
        f.searched_on_time,
        p.unique_property_id,
        p.property_name,
        p.property_type,
        p.sub_type,
        p.property_for,
        p.unit_flat_house_no,
        p.state_id,
        p.city_id,
        p.location_id,
        p.street,
        p.address,
        p.zipcode,
        p.latitude,
        p.longitude,
        p.bedrooms,
        p.builtup_area,
        p.builtup_unit,
        p.additional_amount,
        p.property_cost,
        p.bathroom,
        p.balconies,
        p.property_in,
        p.facing,
        p.car_parking,
        p.bike_parking,
        p.facilities,
        p.floors,
        p.furnished_status,
        p.transaction_type,
        p.owner_name,
        p.mobile,
        p.whatsapp,
        p.landline,
        p.email,
        p.occupancy,
        p.description,
        p.video_link,
        p.property_status,
        p.admin_approved_status,
        p.posted_by,
        p.paid_details,
        p.other_info,
        p.created_date,
        p.created_time,
        p.updated_date,
        p.updated_time,
        p.admin_approval_date,
        p.image,
        p.google_address,
        p.user_type,
        p.total_floors,
        p.open_parking,
        p.carpet_area,
        p.under_construction,
        p.ready_to_move,
        p.updated_from,
        p.property_age,
        p.types,
        p.available_from,
        p.monthly_rent,
        p.security_deposit,
        p.maintenance,
        p.lock_in,
        p.brokerage_charge,
        p.plot_area,
        p.ownership_type,
        p.length_area,
        p.width_area,
        p.zone_types,
        p.business_types,
        p.rera_approved,
        p.passenger_lifts,
        p.service_lifts,
        p.stair_cases,
        p.private_parking,
        p.public_parking,
        p.private_washrooms,
        p.public_washrooms,
        p.area_units,
        p.pent_house,
        p.servant_room,
        p.possession_status,
        p.builder_plot,
        p.investor_property,
        p.loan_facility,
        p.plot_number,
        p.pantry_room,
        p.total_project_area,
        p.uploaded_from_seller_panel,
        p.featured_property,
        p.total_project_area_type,
        p.land_sub_type,
        p.unit_cost_type,
        p.property_cost_type,
        p.builder_name,
        p.villa_number
      FROM favourites f
      LEFT JOIN properties p ON f.unique_property_id = p.unique_property_id
      WHERE f.user_id = ?
      ORDER BY f.searched_on_date DESC, f.searched_on_time DESC
    `;
    pool.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching favourites:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });
      }
      const favourites = results.map((row) => ({
        user_id: row.user_id,
        searched_on_date: row.searched_on_date,
        searched_on_time: row.searched_on_time,
        ...row,
      }));
      return res.status(200).json({ favourites });
    });
  },
  postIntrest: (req, res) => {
    const { user_id, unique_property_id, property_name } = req.body;
    if (!user_id || !unique_property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID are required" });
    }

    const checkQuery = `
      SELECT id FROM favourites 
      WHERE user_id = ? AND unique_property_id = ?
    `;
    pool.query(checkQuery, [user_id, unique_property_id], (err, results) => {
      if (err) {
        console.error("Error checking favourite:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });
      }
      if (results.length > 0) {
        const deleteQuery = `
          DELETE FROM favourites 
          WHERE user_id = ? AND unique_property_id = ?
        `;
        pool.query(
          deleteQuery,
          [user_id, unique_property_id],
          (err, result) => {
            if (err) {
              console.error("Error deleting favourite:", err);
              return res
                .status(500)
                .json({ error: "Database error", details: err.message });
            }
            return res
              .status(200)
              .json({ message: "Favourite removed successfully" });
          }
        );
      } else {
        const searched_on_date = moment().format("YYYY-MM-DD");
        const searched_on_time = moment().format("HH:mm:ss");
        const insertQuery = `
          INSERT INTO favourites (user_id, unique_property_id, property_name, searched_on_date, searched_on_time)
          VALUES (?, ?, ?, ?, ?)
        `;
        pool.query(
          insertQuery,
          [
            user_id,
            unique_property_id,
            property_name || null,
            searched_on_date,
            searched_on_time,
          ],
          (err, result) => {
            if (err) {
              console.error("Error inserting favourite:", err);
              return res
                .status(500)
                .json({ error: "Database error", details: err.message });
            }
            return res
              .status(200)
              .json({ message: "Favourite added successfully" });
          }
        );
      }
    });
  },
  deleteIntrest: (req, res) => {
    const { user_id, unique_property_id } = req.body;
    if (!user_id || !unique_property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Property ID are required" });
    }
    if (typeof user_id !== "string" || user_id.length > 100) {
      return res.status(400).json({ message: "Invalid user_id format" });
    }
    if (
      typeof unique_property_id !== "string" ||
      unique_property_id.length > 100
    ) {
      return res
        .status(400)
        .json({ message: "Invalid unique_property_id format" });
    }
    const deleteQuery = `
      DELETE FROM favourites 
      WHERE user_id = ? AND unique_property_id = ?
    `;
    pool.query(deleteQuery, [user_id, unique_property_id], (err, result) => {
      if (err) {
        console.error("Error deleting favourite:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Favourite not found" });
      }
      return res
        .status(200)
        .json({ message: "Favourite removed successfully" });
    });
  },
};
