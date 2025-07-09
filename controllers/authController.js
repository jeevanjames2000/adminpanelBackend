const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "khsfskhfks983493123!@#JSFKORuiweo232";
const bcrypt = require("bcrypt");
const { default: axios } = require("axios");
const moment = require("moment");
module.exports = {
  login: async (req, res) => {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password) {
        return res
          .status(400)
          .json({ error: "Mobile and password are required" });
      }
      pool.query(
        "SELECT * FROM users WHERE mobile = ?",
        [mobile],
        (err, results) => {
          if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: "Internal server error" });
          }
          if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
          }
          const user = results[0];
          if (password !== user.password) {
            return res.status(401).json({ error: "Invalid credentials" });
          }
          const token = jwt.sign(
            { id: user.id, mobile: user.mobile },
            JWT_SECRET,
            { expiresIn: "1h" }
          );
          const { password: _, ...userData } = user;
          res.json({ message: "Login successful", user: userData, token });
        }
      );
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  loginAgents: (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res
        .status(400)
        .json({ message: "Mobile and password are required" });
    }
    const query = `SELECT * FROM employees WHERE mobile = ?`;
    pool.query(query, [mobile], async (err, results) => {
      if (err) {
        console.error("Database error during login:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }
      const user = results[0];
      const allowedUserTypes = [1, 7, 8, 9, 10, 11];
      if (!allowedUserTypes.includes(user.user_type)) {
        return res
          .status(403)
          .json({ message: "You don't have permission to login" });
      }
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Invalid mobile or password" });
        }
        const token = jwt.sign(
          { id: user.id, mobile: user.mobile },
          JWT_SECRET,
          { expiresIn: "7h" }
        );
        res.status(200).json({
          message: "Login successful",
          user: {
            user_id: user.id,
            mobile: user.mobile,
            name: user.name,
            user_type: user.user_type,
            email: user.email,
            state: user.state,
            city: user.city,
            pincode: user.pincode,
            status: user.status,
            created_userID: user.created_userID,
            created_by: user.created_by,
            photo: user.photo,
          },
          token,
        });
      } catch (compareError) {
        console.error("Bcrypt compare error:", compareError);
        return res
          .status(500)
          .json({ message: "Error while verifying password" });
      }
    });
  },
  sendOtp: async (req, res) => {
    const { mobile } = req.query;
    try {
      if (!mobile) {
        return res.status(200).json({
          status: "error",
          message: "Mobile number is required",
        });
      }
      const user_id = "meetowner2023";
      const pwd = "Meet@123";
      const sender_id = "METOWR";
      const sys_otp = Math.floor(1000 + Math.random() * 9000);
      const message = `Dear customer, ${sys_otp} is the OTP for Login it will expire in 2 minutes. Don't share to anyone -MEET OWNER`;
      const api_url = "http://tra.bulksmshyderabad.co.in/websms/sendsms.aspx";
      const params = {
        userid: user_id,
        password: pwd,
        sender: sender_id,
        mobileno: mobile,
        msg: message,
        peid: "1101542890000073814",
        tpid: "1107169859354543707",
      };
      try {
        const response = await axios.get(api_url, { params });
        return res.status(200).json({
          status: "success",
          message: "OTP sent successfully!",
          otp: sys_otp,
          apiResponse: response.data,
        });
      } catch (error) {
        return res.status(500).json({
          status: "error",
          message: "Error sending SMS",
          error: error.message,
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  sendGallaboxOTP: async (req, res) => {
    const { mobile, countryCode } = req.body;
    const generatedOtp = Math.floor(1000 + Math.random() * 9000);
    try {
      const response = await axios.post(
        "https://server.gallabox.com/devapi/messages/whatsapp",
        {
          channelId: "67a9e14542596631a8cfc87b",
          channelType: "whatsapp",
          recipient: { name: "Hello", phone: `${countryCode}${mobile}` },
          whatsapp: {
            type: "template",
            template: {
              templateName: "login_otp",
              bodyValues: { otp: generatedOtp },
            },
          },
        },
        {
          headers: {
            apiKey: "67e3a37bfa6fbc8b1aa2edcf",
            apiSecret: "a9fe1160c20f491eb00389683b29ec6b",
            "Content-Type": "application/json",
          },
        }
      );
      console.log("response: ", response.data, generatedOtp);
      res.json({ success: true, data: response.data, otp: generatedOtp });
    } catch (err) {
      console.error("Gallabox OTP error:", err.response?.data || err.message);
      res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  },
  sendWhatsappLeads: async (req, res) => {
    const {
      name,
      mobile,
      ownerName,
      ownerMobile,
      property_name,
      property_subtype,
      google_address,
      sub_type,
    } = req.body;

    const payload = {
      channelId: "67a9e14542596631a8cfc87b",
      channelType: "whatsapp",
      recipient: {
        name: ownerName,
        phone: `91${ownerMobile}`,
      },
      whatsapp: {
        type: "template",
        template: {
          templateName: "leads_information_for_partners_clone",
          bodyValues: {
            name,
            phone: mobile,
            variable_3: sub_type || "Property",
            variable_4: property_name,
            variable_5: google_address?.split(",")[0]?.trim() || "",
          },
        },
      },
    };
    const headers = {
      apiKey: "67e3a37bfa6fbc8b1aa2edcf",
      apiSecret: "a9fe1160c20f491eb00389683b29ec6b",
      "Content-Type": "application/json",
    };
    try {
      const response = await axios.post(
        "https://server.gallabox.com/devapi/messages/whatsapp",
        payload,
        { headers }
      );
      if (response.status === 202) {
        return res.status(200).json({ message: "WhatsApp message sent!" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to send WhatsApp message" });
    }
  },
  AuthLoginNew: async (req, res) => {
    const { mobile } = req.body;
    console.log("mobile: ", mobile);

    try {
      const [rows] = await pool
        .promise()
        .query("SELECT * FROM users WHERE mobile = ?", [mobile]);

      console.log("rows: ", rows);

      if (rows.length === 0) {
        return res.status(404).json({
          status: "error_user_not_found",
          message: "User not found",
        });
      }

      const user = rows[0];
      const user_id = user.id.toString();

      const accessToken = jwt.sign({ user_id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      const user_details = {
        user_id,
        ...user,
      };

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        user_details,
        accessToken,
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },

  AuthRegisterNew: async (req, res) => {
    const {
      userType,
      name,
      mobile,
      city,
      email,
      gst_number,
      rera_number,
      company_name,
      country,
      country_code,
    } = req.body;
    try {
      const [userTypeRows] = await pool
        .promise()
        .query(
          "SELECT login_type_id FROM user_types WHERE login_type = ? LIMIT 1",
          [userType]
        );
      if (userTypeRows.length === 0) {
        return res.status(400).json({
          status: "error_invalid_user_type",
          message: "Invalid user type provided",
        });
      }
      const user_type_id = userTypeRows[0].login_type_id;

      const [existingUserRows] = await pool
        .promise()
        .query("SELECT id FROM users WHERE mobile = ? LIMIT 1", [mobile]);
      if (existingUserRows.length > 0) {
        return res.status(409).json({
          status: "error_user_exists",
          message: "User already exists",
        });
      }
      const created_date = moment().format("YYYY-MM-DD");
      const created_time = moment().format("HH:mm:ss");
      const insertUserQuery = `
        INSERT INTO users 
        (user_type, name, mobile, city, email, created_date, created_time,gst_number,rera_number,company_name,country,country_code)
        VALUES (?, ?, ?, ?, ?, ?, ?,? ,?,?,?,?)
      `;
      const [insertResult] = await pool
        .promise()
        .query(insertUserQuery, [
          user_type_id,
          name,
          mobile,
          city,
          email,
          created_date,
          created_time,
          gst_number,
          rera_number,
          company_name,
          country,
          country_code,
        ]);
      const user_id = insertResult.insertId.toString();
      const accessToken = jwt.sign(
        { user_id: user_id },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );
      const user_details = {
        user_id: user_id,
        user_type: user_type_id,
        name: name,
        mobile: mobile,
        email: email,
        country,
        country_code,
      };
      return res.status(201).json({
        status: "success",
        message: "User created successfully",
        user_details,
        accessToken,
      });
    } catch (error) {
      console.error("Error in AuthRegisterNew:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  AuthRegister: async (req, res) => {
    const {
      userType,
      name,
      mobile,
      city,
      email,
      gst_number,
      rera_number,
      company_name,
    } = req.body;
    try {
      const [userTypeRows] = await pool
        .promise()
        .query(
          "SELECT login_type_id FROM user_types WHERE login_type = ? LIMIT 1",
          [userType]
        );
      if (userTypeRows.length === 0) {
        return res.status(400).json({
          status: "error_invalid_user_type",
          message: "Invalid user type provided",
        });
      }
      const user_type_id = userTypeRows[0].login_type_id;
      const [existingUserRows] = await pool
        .promise()
        .query("SELECT id FROM users WHERE mobile = ? LIMIT 1", [mobile]);
      if (existingUserRows.length > 0) {
        return res.status(409).json({
          status: "error_user_exists",
          message: "User already exists",
        });
      }
      const created_date = moment().format("YYYY-MM-DD");
      const created_time = moment().format("HH:mm:ss");
      const insertUserQuery = `
        INSERT INTO users 
        (user_type, name, mobile, city, email, created_date, created_time,gst_number,rera_number,company_name)
        VALUES (?, ?, ?, ?, ?, ?, ?,? ,?,?)
      `;
      const [insertResult] = await pool
        .promise()
        .query(insertUserQuery, [
          user_type_id,
          name,
          mobile,
          city,
          email,
          created_date,
          created_time,
          gst_number,
          rera_number,
          company_name,
        ]);
      const user_id = insertResult.insertId.toString();
      const accessToken = jwt.sign(
        { user_id: user_id },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );
      const user_details = {
        user_id: user_id,
        user_type: user_type_id,
        name: name,
        mobile: mobile,
        email: email,
      };
      return res.status(201).json({
        status: "success",
        message: "User created successfully",
        user_details,
        accessToken,
      });
    } catch (error) {
      console.error("Error in AuthRegisterNew:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  LoginActivity: async (req, res) => {
    const { user_id, mobile } = req.body;
    res.status(200).json({ message: "Login activity recorded successfully" });
  },
  sendOtpSellers: async (req, res) => {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(200).json({
        status: "error",
        message: "Mobile number is required",
      });
    }
    try {
      const user_id = "meetowner2023";
      const pwd = "Meet@123";
      const sender_id = "METOWR";
      const sys_otp = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Dear customer, ${sys_otp} is the OTP for Login it will expire in 2 minutes. Don't share to anyone -MEET OWNER`;
      const api_url = "http://tra.bulksmshyderabad.co.in/websms/sendsms.aspx";
      const params = {
        userid: user_id,
        password: pwd,
        sender: sender_id,
        mobileno: mobile,
        msg: message,
        peid: "1101542890000073814",
        tpid: "1107169859354543707",
      };
      const hashedOtp = await bcrypt.hash(sys_otp, 10);
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
      const [rows] = await pool
        .promise()
        .query("SELECT id FROM users WHERE mobile = ?", [mobile]);
      if (rows.length === 0) {
        await pool
          .promise()
          .query(
            "INSERT INTO users (mobile, otp_hash, otp_expires_at) VALUES (?, ?, ?)",
            [mobile, hashedOtp, expiresAt]
          );
      } else {
        await pool
          .promise()
          .query(
            "UPDATE users SET otp_hash = ?, otp_expires_at = ? WHERE mobile = ?",
            [hashedOtp, expiresAt, mobile]
          );
      }
      const response = await axios.get(api_url, { params });
      return res.status(200).json({
        status: "success",
        message: "OTP sent successfully!",
        apiResponse: response.data,
      });
    } catch (error) {
      console.error("Send OTP Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  verifyOtpSellers: async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Mobile number and OTP are required",
      });
    }
    try {
      const [rows] = await pool
        .promise()
        .query("SELECT otp_hash, otp_expires_at FROM users WHERE mobile = ?", [
          mobile,
        ]);
      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }
      const { otp_hash, otp_expires_at } = rows[0];
      if (new Date() > new Date(otp_expires_at)) {
        return res.status(400).json({
          status: "error",
          message: "OTP has expired",
        });
      }
      const isMatch = await bcrypt.compare(otp, otp_hash);
      if (!isMatch) {
        return res.status(400).json({
          status: "error",
          message: "Incorrect OTP",
        });
      }
      return res.status(200).json({
        status: "success",
        message: "OTP verified successfully!",
      });
    } catch (error) {
      console.error("Verify OTP Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  sendOtpAdmin: async (req, res) => {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(200).json({
        status: "error",
        message: "Mobile number is required",
      });
    }
    try {
      const user_id = "meetowner2023";
      const pwd = "Meet@123";
      const sender_id = "METOWR";
      const sys_otp = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Dear customer, ${sys_otp} is the OTP for Login it will expire in 2 minutes. Don't share to anyone -MEET OWNER`;
      const api_url = "http://tra.bulksmshyderabad.co.in/websms/sendsms.aspx";
      const params = {
        userid: user_id,
        password: pwd,
        sender: sender_id,
        mobileno: mobile,
        msg: message,
        peid: "1101542890000073814",
        tpid: "1107169859354543707",
      };
      const hashedOtp = await bcrypt.hash(sys_otp, 10);
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
      const [rows] = await pool
        .promise()
        .query("SELECT id FROM employees WHERE mobile = ?", [mobile]);
      if (rows.length === 0) {
        await pool
          .promise()
          .query(
            "INSERT INTO employees (mobile, otp_hash, otp_expires_at) VALUES (?, ?, ?)",
            [mobile, hashedOtp, expiresAt]
          );
      } else {
        await pool
          .promise()
          .query(
            "UPDATE employees SET otp_hash = ?, otp_expires_at = ? WHERE mobile = ?",
            [hashedOtp, expiresAt, mobile]
          );
      }
      const response = await axios.get(api_url, { params });
      return res.status(200).json({
        status: "success",
        message: "OTP sent successfully!",
        apiResponse: response.data,
      });
    } catch (error) {
      console.error("Send OTP Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
  verifyOtpAdmin: async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Mobile number and OTP are required",
      });
    }
    try {
      const [rows] = await pool
        .promise()
        .query(
          "SELECT otp_hash, otp_expires_at FROM employees WHERE mobile = ?",
          [mobile]
        );
      if (rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }
      const { otp_hash, otp_expires_at } = rows[0];
      if (new Date() > new Date(otp_expires_at)) {
        return res.status(400).json({
          status: "error",
          message: "OTP has expired",
        });
      }
      const isMatch = await bcrypt.compare(otp, otp_hash);
      if (!isMatch) {
        return res.status(400).json({
          status: "error",
          message: "Incorrect OTP",
        });
      }
      return res.status(200).json({
        status: "success",
        message: "OTP verified successfully!",
      });
    } catch (error) {
      console.error("Verify OTP Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
};
