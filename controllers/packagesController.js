const pool = require("../config/db");
const moment = require("moment");
const logger = require("../logger");

module.exports = {
  getAllPackages: (req, res) => {
    const query = `
      SELECT 
        p.id AS package_id,
        p.name,
        p.duration_days,
        p.price,
        pr.rule_name,
        pr.included
      FROM packageNames p
      LEFT JOIN package_rules pr ON p.id = pr.package_id
      ORDER BY p.id, pr.id;
    `;

    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching packages:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      const packagesMap = {};

      results.forEach((row) => {
        const id = row.package_id;
        if (!packagesMap[id]) {
          packagesMap[id] = {
            id: String(id),
            name: row.name,
            duration_days: row.duration_days,
            price: row.price,
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
      return res
        .status(400)
        .json({ success: false, message: "payment_status query is required" });
    }

    const query = `SELECT * FROM payment_details WHERE payment_status = ?`;
    pool.query(query, [payment_status], (err, results) => {
      if (err) {
        console.error("Error fetching subscriptions:", err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }

      return res.status(200).json({ success: true, data: results });
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
             payment_status, created_at
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
      (user_id, name, mobile, email, subscription_package, subscription_start_date, subscription_expiry_date, subscription_status, payment_status, payment_amount, payment_reference, payment_mode, payment_gateway, transaction_time) 
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
};
