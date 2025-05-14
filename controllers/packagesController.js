const pool = require("../config/db");
const moment = require("moment");
const logger = require("../logger");
module.exports = {
  getAllPackages: (req, res) => {
    const { package_for, city } = req.query;
    if (!city) {
      return res.status(400).json({ message: "city query is required" });
    }
    let query = `
      SELECT 
        p.id AS package_id,
        p.name,
        p.duration_days,
        COALESCE(pcp.price, p.price) AS price,
        p.is_popular,
        p.button_text,
        COALESCE(pcp.price, p.price) / (1 + p.gst_percentage / 100) AS actual_amount,
        (COALESCE(pcp.price, p.price) / (1 + p.gst_percentage / 100)) * (p.gst_percentage / 100) AS gst,
        (COALESCE(pcp.price, p.price) / (1 + p.gst_percentage / 100)) * (p.gst_percentage / 200) AS sgst,
        p.gst_percentage,
        p.gst_number,
        p.rera_number,
        p.package_for,
        pr.rule_name,
        pr.included
      FROM packageNames p
      LEFT JOIN package_city_pricing pcp ON p.id = pcp.package_id AND pcp.city = ?
      LEFT JOIN package_rules pr ON p.id = pr.package_id
    `;
    const params = [city];
    if (package_for) {
      query += ` WHERE p.package_for = ?`;
      params.push(package_for);
    }
    query += ` ORDER BY p.id, pr.id;`;
    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching packages:", err);
        return res
          .status(500)
          .json({ message: "Internal server error", error: err.message });
      }
      const packagesMap = {};
      results.forEach((row) => {
        const id = row.package_id;
        if (!packagesMap[id]) {
          packagesMap[id] = {
            id: String(id),
            name: row.name,
            duration_days: row.duration_days,
            price: parseFloat(row.price).toFixed(2),
            is_popular: row.is_popular === "1",
            button_text: row.button_text,
            actual_amount: parseFloat(row.actual_amount).toFixed(2),
            gst: parseFloat(row.gst).toFixed(2),
            sgst: parseFloat(row.sgst).toFixed(2),
            gst_percentage: parseFloat(row.gst_percentage).toFixed(2),
            gst_number: row.gst_number,
            rera_number: row.rera_number,
            package_for: row.package_for,
            rules: [],
          };
        }
        if (row.rule_name) {
          packagesMap[id].rules.push({
            name: row.rule_name,
            included: row.included === 1,
          });
        }
      });
      const packages = Object.values(packagesMap);
      res.json(packages);
    });
  },
  getAllSubscriptions: (req, res) => {
    const { payment_status } = req.query;
    if (!payment_status) {
      return res.status(400).json({
        success: false,
        message: "payment_status query is required",
      });
    }
    let query;
    let params = [];
    if (payment_status === "expirysoon") {
      query = `
        SELECT * FROM payment_details 
        WHERE subscription_status = 'active' 
        AND subscription_expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
      `;
    } else {
      query = `SELECT * FROM payment_details WHERE payment_status = ?`;
      params = [payment_status];
    }
    pool.query(query, params, (err, results) => {
      if (err) {
        console.error("Error fetching subscriptions:", err);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
      return res.status(200).json({
        success: true,
        data: results,
      });
    });
  },
  getSubscriptionDetails: (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing user_id in query params",
      });
    }
    const userQuery = `
    SELECT id, name, email, mobile, subscription_package, 
           subscription_start_date, subscription_expiry_date, subscription_status 
    FROM users 
    WHERE id = ? LIMIT 1`;
    pool.execute(userQuery, [user_id], (err, userResults) => {
      if (err) {
        console.error("DB Error - users:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch user data",
        });
      }
      if (!userResults || userResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      const user = userResults[0];
      const paymentQuery = `
      SELECT payment_amount, payment_reference, payment_mode, payment_gateway,
             razorpay_order_id, razorpay_payment_id, razorpay_signature,
             subscription_package, subscription_start_date, subscription_expiry_date,
             payment_status, created_at,city
      FROM payment_details 
      WHERE user_id = ? 
      ORDER BY created_at DESC LIMIT 1`;
      pool.execute(paymentQuery, [user_id], (err, paymentResults) => {
        if (err) {
          console.error("DB Error - payment_details:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch payment details",
          });
        }
        const payment = paymentResults.length > 0 ? paymentResults[0] : null;
        return res.json({
          success: true,
          message: "Subscription details fetched",
          data: {
            user,
            payment,
          },
        });
      });
    });
  },
  createSubscription: (req, res) => {
    const {
      userId,
      user_type,
      package,
      payment_status,
      payment_amount,
      payment_reference,
      payment_mode,
      payment_gateway,
      user_name,
      user_mobile,
      user_email,
    } = req.body;
    if (!userId || !package) {
      logger.logError({
        message: "Missing userId or package",
        requestBody: req.body,
      });
      return res
        .status(400)
        .json({ message: "userId and package are required" });
    }
    const packageDisplayNameMap = {
      basic: "Basic",
      prime: "Prime",
      prime_plus: "Prime Plus",
    };
    const selectedDisplayName = packageDisplayNameMap[package.toLowerCase()];
    if (!selectedDisplayName) {
      logger.logError({ message: "Invalid package name", package });
      return res.status(400).json({ message: "Invalid package value" });
    }
    const getDurationQuery = `SELECT duration_days FROM packageNames WHERE name = ? LIMIT 1`;
    pool.query(getDurationQuery, [selectedDisplayName], (err, results) => {
      if (err || results.length === 0) {
        console.error("Error fetching package duration:", err);
        return res
          .status(500)
          .json({ message: "Failed to fetch package details" });
      }
      const durationDays = results[0].duration_days;
      const startDate = moment().format("YYYY-MM-DD HH:mm:ss");
      const expiryDate = moment()
        .add(durationDays, "days")
        .format("YYYY-MM-DD HH:mm:ss");
      const updateUserQuery = `
    UPDATE users 
    SET subscription_package = ?, 
        subscription_start_date = ?, 
        subscription_expiry_date = ?, 
        subscription_status = 'active'
    WHERE id = ?`;
      const insertPaymentQuery = `
      INSERT INTO payment_details 
      (user_id,user_type, name, mobile, email, subscription_package, subscription_start_date, subscription_expiry_date, subscription_status, payment_status, payment_amount, payment_reference, payment_mode, payment_gateway, transaction_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`;
      pool.query(
        updateUserQuery,
        [package, startDate, expiryDate, userId],
        (err) => {
          if (err) {
            logger.logError({
              message: "Error updating user subscription",
              error: err,
              userId,
            });
            console.error("Error updating user subscription:", err);
            return res.status(500).json({ message: "Internal server error" });
          }
          pool.query(
            insertPaymentQuery,
            [
              userId,
              user_type,
              user_name,
              user_mobile,
              user_email,
              package,
              startDate,
              expiryDate,
              payment_status,
              payment_amount,
              payment_reference,
              payment_mode,
              payment_gateway,
              startDate,
            ],
            (err) => {
              if (err) {
                logger.logFailed({
                  message: "User updated but failed to save payment details",
                  error: err,
                  userId,
                  package,
                });
                console.error("Error inserting payment details:", err);
                return res.status(500).json({
                  message: "User updated but failed to save payment details",
                });
              }
              logger.logSuccess({
                message: "Subscription and payment recorded successfully",
                userId,
                user_type,
                package,
                status: payment_status,
                amount: payment_amount,
                payment_reference,
                payment_mode,
                payment_gateway,
              });
              return res.status(200).json({
                message: "Subscription and payment recorded successfully",
              });
            }
          );
        }
      );
    });
  },
  updateSubscription: (req, res) => {
    const { userId, package, expiryDate, status } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const fields = [];
    const values = [];
    if (package) {
      fields.push("subscription_package = ?");
      values.push(package);
    }
    if (expiryDate) {
      fields.push("subscription_expiry_date = ?");
      values.push(moment(expiryDate).format("YYYY-MM-DD HH:mm:ss"));
    }
    if (status) {
      fields.push("subscription_status = ?");
      values.push(status);
    }
    if (fields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    values.push(userId);
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error("Error updating subscription:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      return res
        .status(200)
        .json({ message: "Subscription updated successfully" });
    });
  },
  expiringSoon: (req, res) => {
    const query = `
      SELECT * FROM payment_details 
      WHERE subscription_status = 'active' 
        AND subscription_expiry_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
    `;
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching expiring subscriptions:", err);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
      return res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  },
};
