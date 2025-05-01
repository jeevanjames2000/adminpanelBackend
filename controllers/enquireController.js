const moment = require("moment");
const pool = require("../config/db");

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
    const query = `
    INSERT INTO contact_seller 
    (user_id, unique_property_id, fullname, email, mobile, created_date, updated_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    const values = [
      user_id,
      unique_property_id,
      fullname || null,
      email || null,
      mobile || null,
      created_date,
      updated_date,
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
};
