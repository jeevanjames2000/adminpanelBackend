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
    const generatedUniqueId =
      unique_property_id || "MO-" + Math.floor(100000 + Math.random() * 900000);

    const checkPropertyQuery = `
      SELECT * FROM properties WHERE unique_property_id = ?
    `;
    const updatePropertyQuery = `
      UPDATE properties SET 
        property_in = ?, 
        property_for = ?, 
        transaction_type = ?, 
        user_type = ?, 
        updated_date = ?
      WHERE unique_property_id = ?
    `;
    const insertPropertyQuery = `
      INSERT INTO properties (
        user_id, unique_property_id, property_in, property_for, 
        transaction_type, user_type, updated_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    pool.query(checkPropertyQuery, [generatedUniqueId], (err, rows) => {
      if (err) {
        console.error("Check property error:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }

      const property = rows[0];
      if (property) {
        // Update the existing property
        pool.query(
          updatePropertyQuery,
          [
            property_in,
            property_for,
            transaction_type,
            user_type,
            updated_date,
            generatedUniqueId,
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
                unique_property_id: generatedUniqueId,
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
        // Insert new property
        pool.query(
          insertPropertyQuery,
          [
            user_id,
            generatedUniqueId,
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
                unique_property_id: generatedUniqueId,
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
  addPropertyDetails: async (req, res) => {
    const {
      sub_type,
      rera_approved,
      occupancy,
      bedrooms,
      bathroom,
      balconies,
      furnished_status,
      passenger_lifts,
      service_lifts,
      stair_cases,
      private_parking,
      public_parking,
      private_washrooms,
      public_washrooms,
      available_from,
      property_age,
      under_construction,
      monthly_rent,
      maintenance,
      security_deposit,
      lock_in,
      brokerage_charge,
      types,
      area_units,
      builtup_area,
      carpet_area,
      length_area,
      width_area,
      plot_area,
      total_project_area,
      pent_house,
      builtup_unit,
      property_cost,
      possession_status,
      ownership_type,
      facilities,
      other_info,
      unit_flat_house_no,
      plot_number,
      business_types,
      zone_types,
      investor_property,
      builder_plot,
      loan_facility,
      facing,
      car_parking,
      bike_parking,
      open_parking,
      servant_room,
      pantry_room,
      description,
      google_address,
      user_id,
      unique_property_id,
      total_places_around_property,
    } = req.body;

    if (!unique_property_id) {
      return res.status(400).json({
        status: "error",
        message:
          "Basic details need to be filled first before adding property details",
      });
    }

    try {
      // 1. Fetch property to validate
      const [propertyRows] = await pool
        .promise()
        .query(
          `SELECT id FROM properties WHERE user_id = ? AND unique_property_id = ?`,
          [parseInt(user_id), unique_property_id]
        );

      if (!propertyRows.length) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      const propertyId = propertyRows[0].id;

      const updated_date = moment().format("YYYY-MM-DD");

      // 3. Update the property
      await pool.promise().query(
        `
        UPDATE properties SET
          sub_type = ?, rera_approved = ?, occupancy = ?, bedrooms = ?, bathroom = ?, balconies = ?, 
          furnished_status = ?, passenger_lifts = ?, service_lifts = ?, stair_cases = ?, 
          private_parking = ?, public_parking = ?, private_washrooms = ?, public_washrooms = ?, 
          available_from = ?, property_age = ?, under_construction = ?, monthly_rent = ?, 
          maintenance = ?, security_deposit = ?, lock_in = ?, brokerage_charge = ?, 
          types = ?, area_units = ?, builtup_area = ?, carpet_area = ?, length_area = ?, 
          width_area = ?, plot_area = ?, total_project_area = ?, pent_house = ?, builtup_unit = ?, 
          property_cost = ?, possession_status = ?, ownership_type = ?, facilities = ?, 
          other_info = ?, unit_flat_house_no = ?, plot_number = ?, business_types = ?, 
          zone_types = ?, investor_property = ?, builder_plot = ?, loan_facility = ?, facing = ?, 
          car_parking = ?, bike_parking = ?, open_parking = ?, servant_room = ?, pantry_room = ?, 
          description = ?, google_address = ?, updated_date = ?
        WHERE id = ?
      `,
        [
          sub_type,
          rera_approved,
          occupancy_name,
          bedrooms?.toString(),
          parseInt(bathroom),
          parseInt(balconies),
          furnished_status,
          parseInt(passenger_lifts),
          parseInt(service_lifts),
          parseInt(stair_cases),
          parseInt(private_parking),
          parseInt(public_parking),
          parseInt(private_washrooms),
          parseInt(public_washrooms),
          available_from,
          parseFloat(property_age),
          under_construction,
          parseFloat(monthly_rent),
          maintenance?.toString(),
          parseFloat(security_deposit),
          lock_in,
          parseFloat(brokerage_charge),
          types_name,
          area_units,
          parseFloat(builtup_area),
          parseFloat(carpet_area),
          length_area,
          width_area,
          plot_area,
          total_project_area,
          pent_house,
          builtup_unit,
          parseFloat(property_cost),
          possession_status,
          ownership_type,
          facilities,
          other_info,
          unit_flat_house_no,
          plot_number?.toString(),
          business_types,
          zone_types,
          investor_property,
          builder_plot,
          loan_facility,
          facing_name,
          parseInt(car_parking),
          parseInt(bike_parking),
          open_parking,
          servant_room,
          pantry_room,
          description,
          google_address,
          updated_date,
          propertyId,
        ]
      );

      // 4. Insert nearby places if placeid is null
      if (total_places_around_property && total_places_around_property.length) {
        for (let place of total_places_around_property) {
          if (!place.placeid) {
            await pool
              .promise()
              .query(
                `INSERT INTO around_this_property (unique_property_id, title, distance) VALUES (?, ?, ?)`,
                [unique_property_id, place.place, place.distance]
              );
          }
        }
      }

      return res.status(200).json({
        status: "success",
        message: "Property details updated successfully",
      });
    } catch (error) {
      console.error("SQL Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },
  addAddressDetails: async (req, res) => {
    const {
      city_id,
      unit_flat_house_no,
      floors,
      total_floors,
      unique_property_id,
      property_name,
      location_id,
      plot_number,
    } = req.body;

    try {
      if (!unique_property_id) {
        return res.status(400).json({
          status: "error",
          message:
            "Basic details need to be filled first before adding property details",
        });
      }

      // 1. Get all projects
      const [projects] = await pool
        .promise()
        .query(`SELECT project_name FROM projects`);

      const projectExists = projects.find(
        (p) => p.project_name === property_name
      );

      // 2. Insert project if not exists
      if (property_name && !projectExists) {
        await pool
          .promise()
          .query(`INSERT INTO projects (project_name) VALUES (?)`, [
            property_name,
          ]);
      }

      // 3. Find property
      const [propertyRows] = await pool
        .promise()
        .query(`SELECT * FROM properties WHERE unique_property_id = ?`, [
          unique_property_id,
        ]);

      if (!propertyRows.length) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      const property = propertyRows[0];

      // 4. Get city name
      const [cityRows] = await pool
        .promise()
        .query(`SELECT name FROM cities WHERE id = ?`, [city_id]);

      const city_name = cityRows[0]?.name;
      if (!city_name) {
        return res
          .status(404)
          .json({ status: "error", message: "City not found" });
      }

      const updated_date = new Date().toISOString();

      // Combine city_name and location_id as JSON string or a formatted string
      const google_address = JSON.stringify({ city_name, location_id });

      // 5. Update property
      await pool.promise().query(
        `UPDATE properties SET
          city_id = ?, property_name = ?, unit_flat_house_no = ?, floors = ?, 
          total_floors = ?, location_id = ?, plot_number = ?, updated_date = ?, google_address = ?
         WHERE id = ?`,
        [
          city_name,
          property_name,
          unit_flat_house_no,
          floors,
          total_floors,
          location_id,
          plot_number?.toString(),
          updated_date,
          google_address,
          property.id,
        ]
      );

      const property_details = {
        property_id: property.id,
        unique_property_id: property.unique_property_id,
        property_name,
        city_id: city_name,
        unit_flat_house_no,
        floors,
        total_floors,
        location_id,
        plot_number: plot_number?.toString(),
        updated_date,
        google_address,
      };

      return res.status(200).json({
        status: "success",
        message: "Property details updated successfully",
        property: property_details,
      });
    } catch (error) {
      console.error("SQL Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },
  getPropertyDetails: (req, res) => {},
};
