const pool = require("../config/db");

const jwt = require("jsonwebtoken");
const JWT_SECRET = "khsfskhfks983493123!@#JSFKORuiweo232";
const bcrypt = require("bcrypt");
const { default: axios } = require("axios");
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

    const query = `SELECT * FROM users WHERE mobile = ? AND user_type != 2`;

    pool.query(query, [mobile], async (err, results) => {
      if (err) {
        console.error("Database error during login:", err);
        return res.status(500).json({ message: "Database error" });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid mobile or password" });
      }

      const user = results[0];
      console.log("user: ", user);
      if (!user.password) {
        return res.status(500).json({ message: "Password not found for user" });
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
          {
            expiresIn: "7h",
          }
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
    const { mobile } = req.body;
    const generatedOtp = Math.floor(1000 + Math.random() * 9000);

    try {
      const response = await axios.post(
        "https://server.gallabox.com/devapi/messages/whatsapp",
        {
          channelId: "67a9e14542596631a8cfc87b",
          channelType: "whatsapp",
          recipient: { name: "Hello", phone: `91${mobile}` },
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

    console.log(
      name,
      mobile,
      ownerName,
      ownerMobile,
      property_name,
      google_address,
      sub_type
    );
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
    try {
      const result = await pool.execute(
        "SELECT * FROM users WHERE mobile = 6302816551",
        [mobile]
      );
      console.log("result: ", result);
      const rows = result[0];

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
    const { userType, name, mobile, city } = req.body;
    try {
      const userTypeResult = await pool.execute(
        "SELECT * FROM user_types WHERE login_type = ?",
        [userType]
      );
      const userTypeRows = userTypeResult[0];
      const userTypeData = userTypeRows[0];

      if (!userTypeData) {
        return res.status(400).json({
          status: "error_invalid_user_type",
          message: "Invalid user type provided",
        });
      }

      const user_type_id = userTypeData.login_type_id;

      const cityResult = await pool.execute(
        "SELECT * FROM cities WHERE id = ?",
        [city]
      );
      const cityRows = cityResult[0];
      const cityData = cityRows[0];

      if (!cityData) {
        return res.status(404).json({
          status: "error_city_not_found",
          message: "City not found",
        });
      }

      const existingUserResult = await pool.execute(
        "SELECT * FROM users WHERE mobile = ?",
        [mobile]
      );
      const existingUserRows = existingUserResult[0];
      const existingUser = existingUserRows[0];

      if (existingUser) {
        return res.status(409).json({
          status: "error_user_exists",
          message: "User already exists",
        });
      }

      const created_date = new Date();
      const created_time = new Date();

      const insertResult = await pool.execute(
        "INSERT INTO users (user_type, name, mobile, city, created_date, created_time) VALUES (?, ?, ?, ?, ?, ?)",
        [user_type_id, name, mobile, cityData.name, created_date, created_time]
      );

      console.log("insertResult: ", insertResult);
      const insertInfo = insertResult[0];
      const user_id = insertInfo.insertId.toString();

      const accessToken = jwt.sign({ user_id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      const user_details = {
        user_id,
        user_type: user_type_id,
        name,
        mobile,
      };

      return res.status(201).json({
        status: "success",
        message: "User created successfully",
        user_details,
        accessToken,
      });
    } catch (error) {
      console.error("Register Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  },
};
