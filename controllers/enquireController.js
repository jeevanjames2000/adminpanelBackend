const moment = require("moment");
const pool = require("../config/db");
const { default: axios } = require("axios");

module.exports = {
  getAllEnquiries: (req, res) => {
    const query = `SELECT * FROM searched_properties ORDER BY id DESC`;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching enquiries:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "No enquiries found" });
      }
      return res.status(200).json({ results });
    });
  },
  getAllContactSellers: (req, res) => {
    const query = `SELECT * FROM contact_seller ORDER BY id DESC`;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching contact sellers:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "No contact sellers found" });
      }
      return res.status(200).json({ results });
    });
  },
  getAllContactSellersByFilter: async (req, res) => {
    const { property_for, search = "" } = req.query;
    try {
      const query = `
        SELECT 
          cs.id, cs.user_id, cs.unique_property_id, cs.fullname, cs.mobile, cs.email, cs.created_date,
          COALESCE(p.property_for, 'Unknown') AS property_for,
          p.property_name,
          -- Owner Details
          u.id AS owner_user_id, u.name AS owner_name, u.mobile AS owner_mobile,
          u.email AS owner_email, u.photo AS owner_photo, u.user_type AS owner_type
        FROM contact_seller cs
        LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
        LEFT JOIN users u ON p.user_id = u.id
        ${property_for ? "WHERE p.property_for = ?" : ""}
        ORDER BY cs.id DESC
      `;
      const values = property_for ? [property_for] : [];
      const [results] = await pool.promise().query(query, values);
      if (results.length === 0) {
        return res.status(404).json({
          message: `No contact sellers found for: ${property_for || "All"}`,
          count: 0,
          data: [],
        });
      }
      return res.status(200).json({
        message: "Data fetched successfully",
        count: results.length,
        data: results,
      });
    } catch (error) {
      console.error("Error fetching contact sellers:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  getUserContactSellers: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const query = `SELECT * FROM contact_seller WHERE user_id = ? ORDER BY id DESC`;
    pool.query(query, [user_id], (err, results) => {
      if (err) {
        console.error("Error fetching contact sellers for user:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "No contact sellers found for this user" });
      }
      return res.status(200).json({ results });
    });
  },
  postEnquiry: (req, res) => {
    const {
      property_id,
      user_id,
      name,
      mobile,
      email,
      interested_status,
      property_user_id,
      searched_filter_desc,
      shedule_date,
      shedule_time,
    } = req.body;
    if (!property_id || !user_id) {
      return res
        .status(400)
        .json({ message: "Property ID and User ID are required" });
    }
    const searched_on_date = moment().format("YYYY-MM-DD");
    const searched_on_time = moment().format("HH:mm:ss");
    const query = `
    INSERT INTO searched_properties 
    (
      property_id,
      user_id,
      name,
      mobile,
      email,
      searched_on_date,
      searched_on_time,
      interested_status,
      property_user_id,
      searched_filter_desc,
      shedule_date,
      shedule_time,
      view_status
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
      property_id,
      user_id,
      name || null,
      mobile || null,
      email || null,
      searched_on_date,
      searched_on_time,
      1,
      property_user_id || null,
      searched_filter_desc || null,
      shedule_date || null,
      shedule_time || null,
      0,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting enquiry:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(200).json({ message: "Enquiry saved successfully" });
    });
  },
  contactSeller: (req, res) => {
    const { user_id, unique_property_id, fullname, email, mobile } = req.body;
    if (!user_id || !unique_property_id) {
      return res
        .status(400)
        .json({ message: "User ID and Unique Property ID are required" });
    }
    const created_date = moment().format("YYYY-MM-DD");
    const updated_date = moment().format("YYYY-MM-DD");
    const created_time = moment().format("HH:mm:ss");
    const query = `
    INSERT INTO contact_seller 
    (user_id, unique_property_id, fullname, email, mobile, created_date, updated_date,created_time) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
      user_id,
      unique_property_id,
      fullname || null,
      email || null,
      mobile || null,
      created_date,
      updated_date,
      created_time,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting contact seller info:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res
        .status(200)
        .json({ message: "Contact seller entry added successfully" });
    });
  },
  scheduleVisit: (req, res) => {
    const {
      property_id,
      user_id,
      name,
      mobile,
      email,
      interested_status,
      property_user_id,
      searched_filter_desc,
      shedule_date,
      shedule_time,
      view_status,
    } = req.body;
    if (!property_id || !user_id) {
      return res
        .status(400)
        .json({ message: "Property ID and User ID are required" });
    }
    const searched_on_date = moment().format("YYYY-MM-DD");
    const searched_on_time = moment().format("HH:mm:ss");
    const query = `
    INSERT INTO searched_properties 
    (
      property_id,
      user_id,
      name,
      mobile,
      email,
      searched_on_date,
      searched_on_time,
      interested_status,
      property_user_id,
      searched_filter_desc,
      shedule_date,
      shedule_time,
      view_status
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
      property_id,
      user_id,
      name || null,
      mobile || null,
      email || null,
      searched_on_date,
      searched_on_time,
      2,
      property_user_id || null,
      searched_filter_desc || null,
      shedule_date || null,
      shedule_time || null,
      view_status || null,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting enquiry:", err);
        return res.status(500).json({ error: "Database error" });
      }
      return res.status(200).json({ message: "Enquiry saved successfully" });
    });
  },
  contactUs: (req, res) => {
    const { name, mobile, email, message } = req.body;
    if (!name || !mobile || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const status = 1;
    const created_date = moment().format("YYYY-MM-DD");
    const created_time = moment().format("HH:mm:ss");
    const updated_date = created_date;
    const updated_time = created_time;
    const sql = `
    INSERT INTO customer_messages 
    (name, mobile, email, message, status, created_date, created_time, updated_date, updated_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
      name,
      mobile,
      email,
      message,
      status,
      created_date,
      created_time,
      updated_date,
      updated_time,
    ];
    pool.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error inserting contact message:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res
        .status(200)
        .json({ success: true, message: "Message submitted successfully" });
    });
  },
  sendLeadTextMessage: async (req, res) => {
    const { ownerMobile, mobile, name, location, sub_type, property_cost } =
      req.body;
    if (!mobile) {
      return res.status(400).json({
        status: "error",
        message: "Mobile number is required",
      });
    }
    const user_id = "meetowner2023";
    const pwd = "Meet@123";
    const sender_id = "METOWR";
    const peid = "1101542890000073814";
    const tpid = "1107173821300933878";
    const message = `Dear partner, ${name} ${mobile} is Interested in your ${sub_type} at ${property_cost} in ${location} -MEET OWNER`;
    const api_url = "http://tra.bulksmshyderabad.co.in/websms/sendsms.aspx";
    try {
      const response = await axios.get(api_url, {
        params: {
          userid: user_id,
          password: pwd,
          sender: sender_id,
          mobileno: ownerMobile,
          msg: message,
          peid: peid,
          tpid: tpid,
        },
      });
      return res.status(200).json({
        status: "success",
        message: "Lead SMS sent successfully!",
        apiResponse: response.data,
      });
    } catch (error) {
      console.error("SMS API Error:", error.message);
      return res.status(500).json({
        status: "error",
        message: "Error sending SMS",
        error: error.message,
      });
    }
  },
  userActivity: (req, res) => {
    const {
      user_id,
      name,
      mobile,
      email,
      searched_location,
      searched_city,
      searched_for,
      sub_type,
      property_in,
    } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const created_date = moment().format("YYYY-MM-DD");
    const created_time = moment().format("HH:mm:ss");
    const query = `
      INSERT INTO usersActivity (
        user_id, mobile, email, name, searched_location, searched_for,
        searched_city, property_in, sub_type, created_date, created_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user_id,
      mobile || null,
      email || null,
      name || null,
      searched_location || null,
      searched_for || null,
      searched_city || null,
      property_in || null,
      sub_type || null,
      created_date,
      created_time,
    ];
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error inserting user activity:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.status(200).json({ message: "User activity recorded successfully" });
    });
  },
  getMostSearchedLocations: (req, res) => {
    const { city } = req.query;
    if (city) {
      const query = `
        SELECT * FROM usersActivity
        WHERE searched_location = ?
        ORDER BY created_date DESC, created_time DESC
      `;
      pool.query(query, [city], (err, results) => {
        if (err) {
          console.error("Error fetching user activity for city:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({
          message: `User search data for city: ${city}`,
          count: results.length,
          data: results,
        });
      });
    } else {
      const query = `
        SELECT 
          searched_location,
          COUNT(*) AS total_searches
        FROM usersActivity
        WHERE searched_location IS NOT NULL AND searched_location != ''
        GROUP BY searched_location
        ORDER BY total_searches DESC
      `;
      pool.query(query, (err, results) => {
        if (err) {
          console.error("Error fetching most searched locations:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json({
          message: "Most searched locations fetched successfully",
          count: results.length,
          data: results,
        });
      });
    }
  },
  getCurrentActiveUsers: (req, res) => {
    const query = `
    SELECT 
      u.id AS user_id,
      u.name,
      u.photo,
      u.email,
      u.created_date,
      u.created_time,
      u.city,
      u.subscription_status,
      u.subscription_package,
      u.subscription_start_date,
      u.subscription_expiry_date,
      us.last_active,
      us.device_type,
      us.ip_address,
      us.mobile
    FROM user_sessions us
    INNER JOIN users u ON us.user_id = u.id
    WHERE us.is_online = 1
  `;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching active users with details:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({
        count: results.length,
        activeUsers: results,
      });
    });
  },
  getAllEnqueriesCount: async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ message: "User ID required" });
    }
    try {
      const [properties] = await pool
        .promise()
        .query(
          `SELECT unique_property_id FROM properties WHERE user_id = ? AND property_name IS NOT NULL`,
          [user_id]
        );
      if (!properties.length) {
        return res
          .status(200)
          .json({ total_enquiries: 0, total_favourites: 0 });
      }
      const propertyIds = properties.map((p) => p.unique_property_id);
      if (!propertyIds.length) {
        return res
          .status(200)
          .json({ total_enquiries: 0, total_favourites: 0 });
      }
      const placeholders = propertyIds.map(() => "?").join(",");
      const [enquiries] = await pool
        .promise()
        .query(
          `SELECT COUNT(*) AS total_enquiries FROM contact_seller WHERE unique_property_id IN (${placeholders})`,
          propertyIds
        );
      const [favourites] = await pool
        .promise()
        .query(
          `SELECT COUNT(*) AS total_favourites FROM favourites WHERE unique_property_id IN (${placeholders})`,
          propertyIds
        );
      res.status(200).json({
        total_enquiries: enquiries[0].total_enquiries,
        total_favourites: favourites[0].total_favourites,
      });
    } catch (error) {
      console.error("Error fetching enquiries/favourites:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getPropertyEnquiries: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const query = `
      SELECT 
        cs.*, 
        u.id AS user_id, 
        u.name AS user_name, 
        u.email AS user_email, 
        u.mobile AS user_mobile,
        p.property_name AS property_name,
        p.sub_type,p.property_for,p.property_type,
        p.property_in,p.state_id,p.city_id,p.location_id,
        p.property_cost,p.bedrooms,p.bathroom,
        p.facing,p.car_parking,p.bike_parking,p.description,
        p.image,p.google_address
      FROM contact_seller cs
      LEFT JOIN users u ON cs.user_id = u.id
      LEFT JOIN properties p ON cs.unique_property_id = p.unique_property_id
      WHERE p.user_id = ?
      ORDER BY cs.id DESC
    `;
    pool.query(query, [user_id], (err, results) => {
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
          .json({ message: "No contact sellers found for this user" });
      }
      const count = results.length;
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
      return res.status(200).json({ count, formattedResults });
    });
  },
  getAllFavouritesByUserId: async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    try {
      const [properties] = await pool
        .promise()
        .query(`SELECT unique_property_id FROM properties WHERE user_id = ?`, [
          user_id,
        ]);
      if (!properties.length) {
        return res.status(200).json({ count: 0, favourites: [] });
      }
      const propertyIds = properties.map((p) => p.unique_property_id);
      const placeholders = propertyIds.map(() => "?").join(",");
      const [favourites] = await pool.promise().query(
        `
          SELECT 
            f.*, 
            u.id AS user_id, 
            u.name AS user_name, 
            u.email AS user_email, 
            u.mobile AS user_mobile,
            u.subscription_package,
            u.state,u.city,u.location,u.address,u.pincode,
            u.created_userID,u.assigned_emp_id,u.assigned_emp_type,u.assigned_emp_name,
            p.property_name
          FROM favourites f
          LEFT JOIN users u ON f.User_user_id = u.id
          LEFT JOIN properties p ON f.unique_property_id = p.unique_property_id
          WHERE f.unique_property_id IN (${placeholders})
          ORDER BY f.id DESC
          `,
        propertyIds
      );
      const formattedResults = favourites.map((row) => {
        const {
          property_name,
          user_id,
          user_name,
          user_email,
          user_mobile,
          state,
          city,
          location,
          address,
          pincode,
          assigned_id,
          created_userID,
          assigned_emp_id,
          assigned_emp_type,
          assigned_emp_name,
          ...favourite
        } = row;
        return {
          property_name,
          ...favourite,
          userDetails: {
            id: user_id,
            name: user_name,
            email: user_email,
            mobile: user_mobile,
            city,
            state,
            location,
            address,
            pincode,
            assigned_id,
            created_userID,
            assigned_emp_id,
            assigned_emp_type,
            assigned_emp_name,
          },
        };
      });
      return res.status(200).json({
        count: favourites.length,
        favourites: formattedResults,
      });
    } catch (err) {
      console.error("Error fetching favourites:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
