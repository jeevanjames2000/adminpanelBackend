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
        pr.id,
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
            id: row.id,
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
  insertRules: (req, res) => {
    const { package_id, package_for, rules } = req.body;
    if (!package_id || !package_for || !Array.isArray(rules)) {
      return res.status(400).json({
        message: "package_id, package_for, and rules are required",
      });
    }
    const values = rules.map((rule) => [
      package_id,
      rule.name,
      rule.included ? 1 : 0,
    ]);
    const insertQuery =
      "INSERT INTO package_rules (package_id, rule_name, included) VALUES ?";
    pool.query(insertQuery, [values], (err) => {
      if (err) {
        return res.status(500).json({
          message: "Error inserting rules",
          error: err.message,
        });
      }
      res.json({ message: "Rules inserted successfully" });
    });
  },
  editRule: (req, res) => {
    const {
      rules,
      packageNameId,
      name,
      price,
      duration_days,
      button_text,
      actual_amount,
      gst,
      sgst,
      gst_percentage,
      gst_number,
      rera_number,
    } = req.body;
    let ruleUpdated = false;
    let packageUpdated = false;
    let ruleErrors = [];
    let packageError = null;
    let pending = 0;
    let responded = false;
    const sendFinalResponse = () => {
      if (pending > 0 || responded) return;
      responded = true;
      if (ruleErrors.length > 0 || packageError) {
        return res.status(500).json({
          message: "Error during update",
          ruleErrors,
          packageError,
        });
      }
      if (ruleUpdated && packageUpdated) {
        return res.json({
          message: "Rule(s) and package updated successfully",
        });
      } else if (ruleUpdated) {
        return res.json({ message: "Rule(s) updated successfully" });
      } else if (packageUpdated) {
        return res.json({ message: "Package updated successfully" });
      } else {
        return res.status(400).json({ message: "Nothing to update" });
      }
    };
    if (Array.isArray(rules) && rules.length > 0) {
      rules.forEach((rule) => {
        if (
          rule.id &&
          rule.rule_name !== undefined &&
          typeof rule.included === "boolean"
        ) {
          pending++;
          const ruleUpdateQuery = `
            UPDATE package_rules 
            SET rule_name = ?, included = ? 
            WHERE id = ?
          `;
          pool.query(
            ruleUpdateQuery,
            [rule.rule_name, rule.included ? 1 : 0, rule.id],
            (err, result) => {
              if (err) {
                ruleErrors.push({ id: rule.id, error: err.message });
              } else if (result.affectedRows === 0) {
                ruleErrors.push({ id: rule.id, error: "Rule not found" });
              } else {
                ruleUpdated = true;
              }
              pending--;
              sendFinalResponse();
            }
          );
        }
      });
    }
    if (packageNameId) {
      const updateFields = [];
      const updateValues = [];
      if (name !== undefined) {
        updateFields.push("name = ?");
        updateValues.push(name);
      }
      if (price !== undefined) {
        updateFields.push("price = ?");
        updateValues.push(price);
      }
      if (duration_days !== undefined) {
        updateFields.push("duration_days = ?");
        updateValues.push(duration_days);
      }
      if (button_text !== undefined) {
        updateFields.push("button_text = ?");
        updateValues.push(button_text);
      }
      if (actual_amount !== undefined) {
        updateFields.push("actual_amount = ?");
        updateValues.push(actual_amount);
      }
      if (gst !== undefined) {
        updateFields.push("gst = ?");
        updateValues.push(gst);
      }
      if (sgst !== undefined) {
        updateFields.push("sgst = ?");
        updateValues.push(sgst);
      }
      if (gst_number !== undefined) {
        updateFields.push("gst_number = ?");
        updateValues.push(gst_number);
      }
      if (rera_number !== undefined) {
        updateFields.push("rera_number = ?");
        updateValues.push(rera_number);
      }
      if (gst_percentage !== undefined) {
        updateFields.push("gst_percentage = ?");
        updateValues.push(gst_percentage);
      }
      if (updateFields.length > 0) {
        pending++;
        const packageUpdateQuery = `
          UPDATE packageNames 
          SET ${updateFields.join(", ")} 
          WHERE id = ?
        `;
        updateValues.push(packageNameId);
        pool.query(packageUpdateQuery, updateValues, (pkgErr, pkgResult) => {
          if (pkgErr) {
            packageError = pkgErr.message;
          } else if (pkgResult.affectedRows === 0) {
            packageError = "Package not found";
          } else {
            packageUpdated = true;
          }
          pending--;
          sendFinalResponse();
        });
      }
    }
    if ((!Array.isArray(rules) || rules.length === 0) && !packageNameId) {
      return res.status(400).json({ message: "No valid update target found" });
    }
    setTimeout(() => {
      if (pending === 0) sendFinalResponse();
    }, 100);
  },
  deleteRule: (req, res) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "Rule id is required" });
    }
    const query = "DELETE FROM package_rules WHERE id = ?";
    pool.query(query, [id], (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Error deleting rule",
          error: err.message,
        });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Rule not found" });
      }
      res.json({ message: "Rule deleted successfully" });
    });
  },
};
