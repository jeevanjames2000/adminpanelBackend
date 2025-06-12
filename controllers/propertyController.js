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
      land_sub_type,
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
      monthly_rent,
      maintenance,
      securityDeposit,
      lock_in,
      brokerageCharge,
      types,
      area_units,
      builtup_area,
      carpet_area,
      length_area,
      width_area,
      plot_area,
      total_project_area,
      total_project_area_type,
      pent_house,
      builtup_unit,
      unit_cost_type,
      property_cost,
      property_cost_type,
      possession_status,
      ownership_type,
      facilities,
      unit_flat_house_no,
      plot_number,
      business_types,
      zone_types,
      investor_property,
      loan_facility,
      facing,
      car_parking,
      bike_parking,
      open_parking,
      servant_room,
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
      const normalizeBoolean = (value) =>
        value === "Yes" || value === 1 ? 1 : 0;
      const parsePeriod = (value) => {
        if (!value) return 0;
        const match = value.toString().match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      const parseBrokerage = (value) => {
        if (!value || value === "None") return 0;
        const match = value.toString().match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      const normalizeNumber = (value) => parseInt(value) || 0;
      const parseBHK = (value) => {
        if (!value) return "0";
        return value.replace(" BHK", "");
      };
      let formattedFacilities = null;
      if (typeof facilities === "string") {
        formattedFacilities = facilities
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item)
          .join(", ");
        if (!formattedFacilities) formattedFacilities = null;
      } else if (Array.isArray(facilities)) {
        formattedFacilities = facilities
          .filter((item) => item && typeof item === "string")
          .join(", ");
        if (!formattedFacilities) formattedFacilities = null;
      }
      const data = {
        sub_type: sub_type || null,
        land_sub_type: land_sub_type || null,
        rera_approved: normalizeBoolean(rera_approved),
        occupancy: occupancy || null,
        bedrooms: parseBHK(bedrooms),
        bathroom: normalizeNumber(bathroom),
        balconies: normalizeNumber(balconies),
        furnished_status: furnished_status || null,
        passenger_lifts: parseInt(passenger_lifts) || 0,
        service_lifts: parseInt(service_lifts) || 0,
        stair_cases: parseInt(stair_cases) || 0,
        private_parking: parseInt(private_parking) || 0,
        public_parking: parseInt(public_parking) || 0,
        private_washrooms: parseInt(private_washrooms) || 0,
        public_washrooms: parseInt(public_washrooms) || 0,
        available_from: available_from
          ? moment(available_from).format("YYYY-MM-DD")
          : null,
        property_age: parseFloat(property_age) || 0,
        monthly_rent: parseFloat(monthly_rent) || 0,
        maintenance: maintenance?.toString() || null,
        security_deposit: parsePeriod(securityDeposit),
        lock_in: parsePeriod(lock_in),
        brokerage_charge: parseBrokerage(brokerageCharge),
        types: types || null,
        area_units: area_units || "Sq.ft",
        builtup_area: parseFloat(builtup_area) || 0,
        carpet_area: parseFloat(carpet_area) || 0,
        length_area: parseFloat(length_area) || 0,
        width_area: parseFloat(width_area) || 0,
        plot_area: parseFloat(plot_area) || 0,
        total_project_area: parseFloat(total_project_area) || 0,
        total_project_area_type: total_project_area_type || null,
        pent_house: normalizeBoolean(pent_house),
        builtup_unit: parseFloat(builtup_unit) || 0,
        unit_cost_type: unit_cost_type || null,
        property_cost: parseFloat(property_cost) || 0,
        property_cost_type: property_cost_type || null,
        possession_status: possession_status || null,
        ownership_type: ownership_type || null,
        facilities: formattedFacilities,
        unit_flat_house_no: unit_flat_house_no || null,
        plot_number: parseInt(plot_number) || null,
        business_types: business_types || null,
        zone_types: zone_types || null,
        investor_property: normalizeBoolean(investor_property),
        loan_facility: normalizeBoolean(loan_facility),
        facing: facing || null,
        car_parking: car_parking,
        bike_parking: bike_parking,
        open_parking: open_parking,
        servant_room: normalizeBoolean(servant_room),
        description: description || null,
        google_address: google_address || null,
        updated_date,
      };
      await pool.promise().query(
        `
        UPDATE properties SET
          sub_type = ?, land_sub_type = ?, rera_approved = ?, occupancy = ?, bedrooms = ?,
          bathroom = ?, balconies = ?, furnished_status = ?, passenger_lifts = ?,
          service_lifts = ?, stair_cases = ?, private_parking = ?, public_parking = ?,
          private_washrooms = ?, public_washrooms = ?, available_from = ?, property_age = ?,
          monthly_rent = ?, maintenance = ?, security_deposit = ?, lock_in = ?,
          brokerage_charge = ?, types = ?, area_units = ?, builtup_area = ?,
          carpet_area = ?, length_area = ?, width_area = ?, plot_area = ?,
          total_project_area = ?, total_project_area_type = ?, pent_house = ?,
          builtup_unit = ?, unit_cost_type = ?, property_cost = ?, property_cost_type = ?,
          possession_status = ?, ownership_type = ?, facilities = ?, unit_flat_house_no = ?,
          plot_number = ?, business_types = ?, zone_types = ?, investor_property = ?,
          loan_facility = ?, facing = ?, car_parking = ?, bike_parking = ?,
          open_parking = ?, servant_room = ?, description = ?, google_address = ?,
          updated_date = ?
        WHERE id = ?
        `,
        [
          data.sub_type,
          data.land_sub_type,
          data.rera_approved,
          data.occupancy,
          data.bedrooms,
          data.bathroom,
          data.balconies,
          data.furnished_status,
          data.passenger_lifts,
          data.service_lifts,
          data.stair_cases,
          data.private_parking,
          data.public_parking,
          data.private_washrooms,
          data.public_washrooms,
          data.available_from,
          data.property_age,
          data.monthly_rent,
          data.maintenance,
          data.security_deposit,
          data.lock_in,
          data.brokerage_charge,
          data.types,
          data.area_units,
          data.builtup_area,
          data.carpet_area,
          data.length_area,
          data.width_area,
          data.plot_area,
          data.total_project_area,
          data.total_project_area_type,
          data.pent_house,
          data.builtup_unit,
          data.unit_cost_type,
          data.property_cost,
          data.property_cost_type,
          data.possession_status,
          data.ownership_type,
          data.facilities,
          data.unit_flat_house_no,
          data.plot_number,
          data.business_types,
          data.zone_types,
          data.investor_property,
          data.loan_facility,
          data.facing,
          data.car_parking,
          data.bike_parking,
          data.open_parking,
          data.servant_room,
          data.description,
          data.google_address,
          data.updated_date,
          propertyId,
        ]
      );
      if (
        total_places_around_property &&
        Array.isArray(total_places_around_property)
      ) {
        for (let place of total_places_around_property) {
          if (
            !place.placeid &&
            place.place &&
            !isNaN(parseFloat(place.distance))
          ) {
            await pool
              .promise()
              .query(
                `INSERT INTO around_this_property (unique_property_id, title, distance) VALUES (?, ?, ?)`,
                [unique_property_id, place.place, parseFloat(place.distance)]
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
      state_id,
      locality,
      unit_flat_house_no,
      floors,
      total_floors,
      unique_property_id,
      property_name,
      plot_number,
      google_address,
    } = req.body;
    if (!unique_property_id) {
      return res.status(400).json({
        status: "error",
        message:
          "Property details need to be filled first before adding address details",
      });
    }
    const conn = pool.promise();
    try {
      if (property_name) {
        const [projects] = await conn.query(
          `SELECT 1 FROM projects WHERE project_name = ? LIMIT 1`,
          [property_name]
        );
        if (projects.length === 0) {
          await conn.query(`INSERT INTO projects (project_name) VALUES (?)`, [
            property_name,
          ]);
        }
      }
      const [propertyRows] = await conn.query(
        `SELECT id, unique_property_id FROM properties WHERE unique_property_id = ?`,
        [unique_property_id]
      );
      if (propertyRows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }
      const property = propertyRows[0];
      const updated_date = moment().format("YYYY-MM-DD");
      await conn.query(
        `UPDATE properties SET
          city_id = ?, state_id = ?, property_name = ?, unit_flat_house_no = ?, floors = ?, 
          total_floors = ?, plot_number = ?, updated_date = ?, google_address = ?,location_id = ?
         WHERE unique_property_id = ?`,
        [
          city_id,
          state_id,
          property_name,
          unit_flat_house_no,
          floors,
          total_floors,
          plot_number?.toString(),
          updated_date,
          google_address,
          locality,
          unique_property_id,
        ]
      );
      return res.status(200).json({
        status: "success",
        message: "Address details updated successfully",
        address: {
          property_id: property.id,
          unique_property_id: property.unique_property_id,
          property_name,
          city_id: city_id,
          state_id: state_id,
          unit_flat_house_no,
          floors,
          total_floors,
          plot_number: plot_number?.toString(),
          updated_date,
          google_address,
        },
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
