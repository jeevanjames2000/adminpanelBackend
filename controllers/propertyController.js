const pool = require("../config/db");
const moment = require("moment");
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const util = require("util");
const userTypeMap = {
  1: "admin",
  2: "user",
  3: "builder",
  4: "agent",
  5: "owner",
  6: "channel_partner",
  7: "manager",
  8: "telecaller",
  9: "marketing_executive",
  10: "customer_support",
  11: "customer_service",
};
const query = util.promisify(pool.query).bind(pool);
async function checkSubscriptionAndProperties(user_id, city) {
  try {
    if (!user_id || isNaN(parseInt(user_id))) {
      throw new Error("Valid User ID is required.");
    }
    if (!city) {
      throw new Error("City is required.");
    }
    const userQuery = `SELECT user_type FROM users WHERE id = ?`;
    const userResult = await query(userQuery, [user_id]);
    if (!userResult.length) {
      throw new Error("User not found.");
    }
    const { user_type } = userResult[0];
    const userTypeKey = userTypeMap[user_type] || "unknown";
    const subscriptionQuery = `
      SELECT subscription_package, payment_status, subscription_status, subscription_start_date, subscription_expiry_date
      FROM payment_details
      WHERE user_id = ? AND city = ? AND payment_status IN ('success', 'processing') AND subscription_status IN ('active', 'processing')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const subscriptionResult = await query(subscriptionQuery, [user_id, city]);
    let effective_package = "Free Listing";
    let subscription_status = "inactive";
    let subscription_start_date = null;
    let subscription_expiry_date = null;
    if (
      subscriptionResult.length &&
      subscriptionResult[0].payment_status === "success"
    ) {
      effective_package = subscriptionResult[0].subscription_package;
      subscription_status = "active";
      subscription_start_date = subscriptionResult[0].subscription_start_date;
      subscription_expiry_date = subscriptionResult[0].subscription_expiry_date;
    }
    const normalizedPackage = (effective_package || "Free Listing")
      .trim()
      .toLowerCase()
      .replace(/ /g, "_");
    const displayPackageMap = {
      free_listing: "Free Listing",
      basic: "Basic",
      prime: "Prime",
      prime_plus: "Prime Plus",
    };
    const displayPackage =
      displayPackageMap[normalizedPackage] || effective_package;
    const propertyCountQuery =
      effective_package === "Free Listing"
        ? `SELECT COUNT(*) AS count FROM properties WHERE user_id = ?`
        : `SELECT COUNT(*) AS count FROM properties WHERE user_id = ? AND city_id = ?`;
    const propertyCountResult = await query(
      propertyCountQuery,
      effective_package === "Free Listing" ? [user_id] : [user_id, city]
    );
    const limitResult = await query(
      `SELECT number_of_listings FROM package_listing_limits WHERE package_name = ? AND package_for = ?`,
      [displayPackage, userTypeKey]
    );
    const uploadedCount = propertyCountResult[0].count;
    if (!limitResult.length) {
      throw new Error(
        `No listing limit found for package '${displayPackage}' and user type '${userTypeKey}'.`
      );
    }
    const allowedListings = limitResult[0].number_of_listings;
    const subscriptionData = {
      allowedListings,
      uploadedCount,
      remaining: Math.max(0, allowedListings - uploadedCount),
      subscriptionPackage: displayPackage,
      userType: userTypeKey,
      city,
      subscription_start_date,
      subscription_expiry_date,
    };
    if (uploadedCount >= allowedListings) {
      return {
        status: "error",
        message: `You have reached your maximum listing limit of ${allowedListings} for ${city}. To upload more listings, please upgrade your package.`,
        data: subscriptionData,
      };
    }
    return {
      status: "success",
      message: `You can upload property in ${city}.`,
      data: subscriptionData,
    };
  } catch (err) {
    console.error("Error in checkSubscriptionAndProperties:", err);
    const defaultData = {
      allowedListings: 0,
      uploadedCount: 0,
      remaining: 0,
      subscriptionPackage: null,
      userType: null,
      city: city || null,
      subscription_start_date: null,
      subscription_expiry_date: null,
    };
    throw new Error(
      JSON.stringify({
        status: "error",
        message: err.message,
        data: defaultData,
      })
    );
  }
}
module.exports = {
  addBasicdetails: async (req, res) => {
    const {
      property_in,
      property_for,
      transaction_type,
      user_id,
      unique_property_id,
      user_type,
      city,
    } = req.body;
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "User id is required, please login and try again",
        data: {
          allowedListings: 0,
          uploadedCount: 0,
          remaining: 0,
          subscriptionPackage: null,
          userType: null,
          city: null,
        },
      });
    }
    if (!city) {
      return res.status(400).json({
        status: "error",
        message: "City is required.",
        data: {
          allowedListings: 0,
          uploadedCount: 0,
          remaining: 0,
          subscriptionPackage: null,
          userType: null,
          city: null,
        },
      });
    }
    try {
      const updated_date = moment().format("YYYY-MM-DD");
      const generatedUniqueId =
        unique_property_id ||
        "MO-" + Math.floor(100000 + Math.random() * 900000);
      const checkPropertyQuery = `
        SELECT * FROM properties WHERE unique_property_id = ?
      `;
      const propertyResult = await query(checkPropertyQuery, [
        generatedUniqueId,
      ]);
      const property = propertyResult[0];
      if (property) {
        const updatePropertyQuery = `
          UPDATE properties SET 
            property_in = ?, 
            property_for = ?, 
            transaction_type = ?, 
            user_type = ?, 
            updated_date = ?,
            city_id = ?
          WHERE unique_property_id = ?
        `;
        await query(updatePropertyQuery, [
          property_in,
          property_for,
          transaction_type,
          user_type,
          updated_date,
          city,
          generatedUniqueId,
        ]);
        return res.status(200).json({
          status: "success",
          message: "Basic details updated successfully",
          data: {
            property: {
              unique_property_id: generatedUniqueId,
              property_in,
              property_for,
              transaction_type,
              user_type,
              updated_date,
              city,
            },
          },
        });
      } else {
        const subscriptionCheck = await checkSubscriptionAndProperties(
          user_id,
          city
        );
        if (subscriptionCheck.status === "error") {
          return res.status(403).json(subscriptionCheck);
        }
        const subscriptionData = subscriptionCheck.data;
        const insertPropertyQuery = `
          INSERT INTO properties (
            user_id, unique_property_id, property_in, property_for, 
            transaction_type, user_type, updated_date, city_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertResult = await query(insertPropertyQuery, [
          user_id,
          generatedUniqueId,
          property_in,
          property_for,
          transaction_type,
          user_type,
          updated_date,
          city,
        ]);
        return res.status(200).json({
          status: "success",
          message: "Property details added successfully",
          data: {
            property: {
              property_id: insertResult.insertId,
              unique_property_id: generatedUniqueId,
              property_in,
              property_for,
              transaction_type,
              user_type,
              updated_date,
              city,
            },
            ...subscriptionData,
          },
        });
      }
    } catch (err) {
      console.error("Error in addBasicdetails:", err);
      const defaultData = {
        allowedListings: 0,
        uploadedCount: 0,
        remaining: 0,
        subscriptionPackage: null,
        userType: null,
        city: city || null,
      };
      try {
        const check = await checkSubscriptionAndProperties(user_id, city);
        defaultData.allowedListings = check.data.allowedListings;
        defaultData.uploadedCount = check.data.uploadedCount;
        defaultData.remaining = check.data.remaining;
        defaultData.subscriptionPackage = check.data.subscriptionPackage;
        defaultData.userType = check.data.userType;
      } catch (innerErr) {
        console.error("Failed to fetch subscription data:", innerErr);
      }
      if (err.message.includes("User not found")) {
        return res.status(404).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      if (err.message.includes("City is required")) {
        return res.status(400).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      if (err.message.includes("listing limit")) {
        return res.status(403).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Internal server error.",
        data: defaultData,
      });
    }
  },
  checkSubscriptionAndProperties: async (req, res) => {
    const { user_id, city } = req.query;
    try {
      const result = await checkSubscriptionAndProperties(user_id, city);
      return res.status(result.status === "success" ? 200 : 403).json(result);
    } catch (err) {
      console.error("Error in checkSubscriptionAndProperties endpoint:", err);
      const defaultData = {
        allowedListings: 0,
        uploadedCount: 0,
        remaining: 0,
        subscriptionPackage: null,
        userType: null,
        city: city || null,
      };
      if (
        err.message.includes("User ID is required") ||
        err.message.includes("City is required")
      ) {
        return res.status(400).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      if (err.message.includes("User not found")) {
        return res.status(404).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      if (err.message.includes("listing limit")) {
        return res.status(403).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Internal server error.",
        data: defaultData,
      });
    }
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
      under_construction,
      pantry_room,
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
        if (!value || value === "None") return 0;
        const match = value.toString().match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      };
      const parseBrokerage = (value) => {
        if (!value || value === "None") return 0.0;
        const match = value.toString().match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0.0;
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
      const formattedUnderConstruction = under_construction
        ? moment(under_construction).format("YYYY-MM-DD")
        : null;
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
        pent_house: pent_house,
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
        investor_property: investor_property,
        loan_facility: loan_facility,
        facing: facing || null,
        car_parking: car_parking,
        bike_parking: bike_parking,
        open_parking: open_parking,
        servant_room: servant_room,
        description: description || null,
        google_address: google_address || null,
        updated_date,
        under_construction: formattedUnderConstruction,
        pantry_room,
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
          open_parking = ?, servant_room = ?, description = ?, google_address = ?,under_construction=?,pantry_room= ?,
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
          data.under_construction,
          data.pantry_room,
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
      builder_name,
      villa_number,
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
          total_floors = ?, plot_number = ?, updated_date = ?, google_address = ?,location_id = ?,builder_name = ?,villa_number = ?
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
          builder_name,
          villa_number,
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
          builder_name,
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
  addPropertyPhotosAndVideos: (req, res) => {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return res.status(500).json({
          status: "error",
          message: "Error parsing the form data",
        });
      }
      const conn = pool.promise();
      try {
        const userId = fields.user_id?.[0];
        const uniquePropertyId = fields.unique_property_id?.[0];
        const uploadedFiles = files.photo || [];
        const imageIds = fields.image_id || [];
        const selectedFeaturedImage = files.featured_image?.[0];
        const uploadedVideoFiles = files.video || [];
        const videoTypes = fields.video_type || [];
        const videoIds = fields.video_id || [];
        if (!userId || !uniquePropertyId) {
          return res.status(400).json({
            status: "error",
            message: "Missing required fields: user_id or unique_property_id",
          });
        }
        const [propertyRows] = await conn.query(
          "SELECT id, unique_property_id FROM properties WHERE user_id = ? AND unique_property_id = ?",
          [parseInt(userId), uniquePropertyId]
        );
        if (propertyRows.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "Property not found",
          });
        }
        const property = propertyRows[0];
        const uploadDir = path.join(__dirname, "..", "Uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const uploadedFileNames = [];
        let featuredImage = null;
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const tempPath = file.path;
          const originalFilename = file.originalFilename;
          const ext = path.extname(originalFilename).toLowerCase();
          const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
          if (!allowedExtensions.includes(ext)) {
            fs.unlinkSync(tempPath);
            continue;
          }
          const isFeaturedImage =
            selectedFeaturedImage?.originalFilename === originalFilename;
          const priority = isFeaturedImage ? 1 : 0;
          if (imageIds[i] && imageIds[i] !== "null") {
            try {
              await conn.query(
                "UPDATE properties_gallery SET priority = ?, uploaded_from_seller_panel = ? WHERE id = ?",
                [priority, "Yes", parseInt(imageIds[i])]
              );
              if (isFeaturedImage) featuredImage = originalFilename;
            } catch (error) {
              console.error(`Failed to update image: ${error.message}`);
            }
            fs.unlinkSync(tempPath);
            continue;
          }
          const timestamp = Date.now();
          const newFilename = `${path.basename(
            originalFilename,
            ext
          )}_${timestamp}${ext}`;
          const targetPath = path.join(uploadDir, newFilename);
          fs.copyFileSync(tempPath, targetPath);
          fs.unlinkSync(tempPath);
          try {
            await conn.query(
              "INSERT INTO properties_gallery (property_id, image, priority, uploaded_from_seller_panel) VALUES (?, ?, ?, ?)",
              [property.unique_property_id, newFilename, priority, "Yes"]
            );
            uploadedFileNames.push(newFilename);
            if (isFeaturedImage) featuredImage = newFilename;
          } catch (error) {
            console.error(`Failed to insert image: ${error.message}`);
          }
        }
        for (let i = 0; i < uploadedVideoFiles.length; i++) {
          const videoFile = uploadedVideoFiles[i];
          const tempPath = videoFile.path;
          const originalFilename = videoFile.originalFilename;
          const ext = path.extname(originalFilename).toLowerCase();
          const allowedExtensions = [".mp4", ".avi", ".mov", ".flv", ".wmv"];
          if (!allowedExtensions.includes(ext)) {
            fs.unlinkSync(tempPath);
            continue;
          }
          if (videoIds[i] && videoIds[i] !== "undefined") {
            fs.unlinkSync(tempPath);
            continue;
          }
          const timestamp = Date.now();
          const newFilename = `${path.basename(
            originalFilename,
            ext
          )}_${timestamp}${ext}`;
          const targetPath = path.join(uploadDir, newFilename);
          fs.copyFileSync(tempPath, targetPath);
          fs.unlinkSync(tempPath);
          try {
            await conn.query(
              "INSERT INTO propertiesvideos (property_id, video_url, type, uploaded_from_seller_panel) VALUES (?, ?, ?, ?)",
              [
                property.unique_property_id,
                newFilename,
                videoTypes[i] || "video",
                "Yes",
              ]
            );
            uploadedFileNames.push(newFilename);
          } catch (error) {
            console.error(`Failed to insert video: ${error.message}`);
          }
        }
        if (featuredImage) {
          try {
            const updated_date = moment().format("YYYY-MM-DD");
            await conn.query(
              "UPDATE properties SET image = ?, uploaded_from_seller_panel = ?, updated_date = ? WHERE unique_property_id = ?",
              [featuredImage, "Yes", updated_date, uniquePropertyId]
            );
          } catch (error) {
            console.error(`Failed to update property: ${error.message}`);
          }
        }
        return res.status(200).json({
          status: "success",
          message: "Photos and videos uploaded successfully",
          data: {
            uploadedFiles: uploadedFileNames,
            featuredImage,
            unique_property_id: property.unique_property_id,
            updated_date: moment().format("YYYY-MM-DD"),
          },
        });
      } catch (error) {
        console.error("SQL Error:", error);
        return res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
    });
  },
  getAllPropertiesUploaded: async (req, res) => {
    const { user_id, city } = req.query;
    if (!user_id || isNaN(parseInt(user_id))) {
      return res.status(400).json({
        status: "error",
        message: "Valid User ID is required.",
        data: {
          allowedListings: 0,
          uploadedCount: 0,
          remaining: 0,
          subscriptionPackage: null,
          userType: null,
          city: city || null,
          subscription_start_date: null,
          subscription_expiry_date: null,
        },
      });
    }
    if (!city) {
      return res.status(400).json({
        status: "error",
        message: "City is required.",
        data: {
          allowedListings: 0,
          uploadedCount: 0,
          remaining: 0,
          subscriptionPackage: null,
          userType: null,
          city: null,
          subscription_start_date: null,
          subscription_expiry_date: null,
        },
      });
    }
    try {
      const subscriptionCheck = await checkSubscriptionAndProperties(
        user_id,
        city
      );
      const { data: subscriptionData, status, message } = subscriptionCheck;
      const propertiesQuery =
        subscriptionData.subscriptionPackage === "Free Listing"
          ? `SELECT * FROM properties WHERE user_id = ?`
          : `SELECT * FROM properties WHERE user_id = ? AND city_id=?`;
      const propertiesResult = await query(
        propertiesQuery,
        subscriptionData.subscriptionPackage === "Free Listing"
          ? [user_id]
          : [user_id, city]
      );
      return res.status(200).json({
        status: "success",
        message: "Properties and subscription details fetched successfully.",
        data: {
          ...subscriptionData,
          totalProperties: propertiesResult.length,
        },
      });
    } catch (err) {
      const defaultData = {
        allowedListings: 0,
        uploadedCount: 0,
        remaining: 0,
        subscriptionPackage: null,
        userType: null,
        city: city || null,
        subscription_start_date: null,
        subscription_expiry_date: null,
        properties: [],
        totalProperties: 0,
      };
      if (
        err.message.includes("User ID is required") ||
        err.message.includes("City is required")
      ) {
        return res.status(400).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      if (
        err.message.includes("User not found") ||
        err.message.includes("City ")
      ) {
        return res.status(404).json({
          status: "error",
          message: err.message,
          data: defaultData,
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Internal server error.",
        data: defaultData,
      });
    }
  },
};
