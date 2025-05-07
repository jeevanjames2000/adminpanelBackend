const razorpayInstance = require("./Razorpay");
const crypto = require("crypto");
const pool = require("../config/db");
const moment = require("moment");
module.exports = {
  createOrder: (req, res) => {
    const { amount, currency, user_id } = req.body;
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    pool.execute(
      `SELECT subscription_expiry_date, subscription_status 
       FROM users 
       WHERE id = ?`,
      [user_id],
      (err, userResults) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check subscription status",
          });
        }
        if (!userResults || userResults.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "User not found" });
        }
        const { subscription_expiry_date, subscription_status } =
          userResults[0];
        const currentDate = moment();
        const expiryDate = moment(subscription_expiry_date);
        if (
          subscription_status === "active" &&
          expiryDate.isAfter(currentDate)
        ) {
          return res.status(400).json({
            success: false,
            message: "Active subscription already exists",
            expiry_date: subscription_expiry_date,
          });
        }
        const options = {
          amount: amount * 100,
          currency: currency || "INR",
          receipt: `receipt_${Date.now()}`,
          payment_capture: 1,
        };
        razorpayInstance.orders.create(options, (err, order) => {
          if (err) {
            console.error("Razorpay Error:", err);
            return res
              .status(500)
              .json({ success: false, message: err.message });
          }
          res.json(order);
        });
      }
    );
  },
  verifyPayment: (req, res) => {
    const {
      user_id,
      name,
      mobile,
      email,
      subscription_package,
      payment_amount,
      payment_reference,
      payment_mode,
      payment_gateway,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_status,
    } = req.body;
    if (!user_id || !subscription_package || !payment_status) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: user_id, subscription_package, or payment_status",
      });
    }
    const packageEnumMap = {
      "Free Listing": "free",
      Basic: "basic",
      Prime: "prime",
      "Prime Plus": "prime_plus",
    };
    const mappedPackageName = packageEnumMap[subscription_package];
    if (!mappedPackageName) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription package format",
      });
    }
    let subscription_start_date = moment().format("YYYY-MM-DD HH:mm:ss");
    let subscription_expiry_date = subscription_start_date;
    let subscription_status = "processing";
    let finalPaymentStatus = payment_status;
    const finalPaymentReference =
      finalPaymentStatus === "processing" ? payment_reference : null;
    const finalRazorpayPaymentId =
      finalPaymentStatus === "processing" ? razorpay_payment_id : null;
    const finalRazorpaySignature =
      finalPaymentStatus === "processing" ? razorpay_signature : null;
    if (finalPaymentStatus === "cancelled") {
      finalPaymentStatus = "cancelled";
      subscription_status = "inactive";
    } else if (finalPaymentStatus === "failed") {
      finalPaymentStatus = "failed";
      subscription_status = "inactive";
    } else if (finalPaymentStatus === "processing") {
      const secret = process.env.RAZORPAY_SECRET;
      if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        const generated_signature = crypto
          .createHmac("sha256", secret)
          .update(razorpay_order_id + "|" + razorpay_payment_id)
          .digest("hex");
        if (generated_signature !== razorpay_signature) {
          finalPaymentStatus = "failed";
          subscription_status = "inactive";
        } else {
          finalPaymentStatus = "processing";
          subscription_status = "processing";
        }
      } else {
        finalPaymentStatus = "failed";
        subscription_status = "inactive";
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment_status value",
      });
    }
    pool.execute(
      `SELECT duration_days, actual_amount, gst, sgst, gst_percentage, gst_number, rera_number 
       FROM packageNames 
       WHERE name = ? LIMIT 1`,
      [subscription_package],
      (err, packageResults) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to fetch package data",
          });
        }
        if (!packageResults || packageResults.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid subscription package" });
        }
        const {
          duration_days,
          actual_amount,
          gst,
          sgst,
          gst_percentage,
          gst_number,
          rera_number,
        } = packageResults[0];
        if (finalPaymentStatus === "processing") {
          subscription_expiry_date = moment()
            .add(duration_days, "days")
            .format("YYYY-MM-DD HH:mm:ss");
        }
        const updateUserQuery = `
          UPDATE users 
          SET subscription_package = ?, 
              subscription_start_date = ?, 
              subscription_expiry_date = ?, 
              subscription_status = ?
          WHERE id = ?`;
        pool.execute(
          updateUserQuery,
          [
            mappedPackageName,
            subscription_start_date,
            subscription_expiry_date,
            subscription_status,
            user_id,
          ],
          (err) => {
            if (err) {
              console.error("User Update Error:", err);
              return res.status(500).json({
                success: false,
                message: "Failed to update user data",
              });
            }
            pool.execute(
              `INSERT INTO payment_details (
                user_id, name, mobile, email,
                subscription_package, subscription_start_date, subscription_expiry_date,
                subscription_status, payment_status, payment_amount,
                payment_reference, payment_mode, payment_gateway,
                razorpay_order_id, razorpay_payment_id, razorpay_signature,
                actual_amount, gst, sgst, gst_percentage, gst_number, rera_number
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                user_id,
                name,
                mobile,
                email,
                mappedPackageName,
                subscription_start_date,
                subscription_expiry_date,
                subscription_status,
                finalPaymentStatus,
                payment_amount || 0,
                finalPaymentReference,
                payment_mode || null,
                payment_gateway || null,
                razorpay_order_id || null,
                finalRazorpayPaymentId,
                finalRazorpaySignature,
                actual_amount || 0,
                gst || 0,
                sgst || 0,
                gst_percentage || 18.0,
                gst_number || null,
                rera_number || null,
              ],
              (err) => {
                if (err) {
                  console.error("DB Insert Error:", err);
                  return res.status(500).json({
                    success: false,
                    message: "Failed to store payment data",
                  });
                }
                res.json({
                  success: finalPaymentStatus === "processing",
                  message:
                    finalPaymentStatus === "processing"
                      ? "Payment recorded as processing"
                      : `Payment ${finalPaymentStatus}`,
                });
              }
            );
          }
        );
      }
    );
  },
  checkSubscription: (req, res) => {
    const { user_id } = req.body;
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    pool.execute(
      `SELECT 
        u.subscription_expiry_date, 
        u.subscription_status,
        (SELECT payment_status FROM payment_details 
         WHERE user_id = ? 
         ORDER BY id DESC LIMIT 1) AS latest_payment_status
     FROM users u 
     WHERE u.id = ?`,
      [user_id, user_id],
      (err, results) => {
        if (err) {
          console.error("DB Query Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to check subscription status",
          });
        }
        if (!results || results.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "User not found" });
        }
        const {
          subscription_expiry_date,
          subscription_status,
          latest_payment_status,
        } = results[0];
        const currentDate = moment();
        const expiryDate = moment(subscription_expiry_date);
        const isSubscriptionActive =
          subscription_status === "active" &&
          expiryDate.isAfter(currentDate) &&
          latest_payment_status === "success";
        res.json({
          success: true,
          isSubscriptionActive,
          payment_status: latest_payment_status || "none",
          expiry_date: subscription_expiry_date,
        });
      }
    );
  },
  razorpayWebhook: async (req, res) => {
    const secret = process.env.RAZORPAY_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);
    const expected_signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    if (expected_signature === signature) {
      res.json({ success: true });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }
  },
  updateSubscription: async (req, res) => {
    const user_id = req.body.user_id || req.query.user_id;
    const subscription_status = req.body.subscription_status;
    const payment_status = req.body.payment_status;

    if (!user_id || !subscription_status || !payment_status) {
      return res.status(400).json({
        success: false,
        message:
          "User ID, subscription status, and payment status are required",
      });
    }

    try {
      const [subscriptions] = await pool.promise().execute(
        `SELECT id FROM payment_details 
       WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
        [user_id]
      );

      if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No subscriptions found",
        });
      }

      const paymentId = subscriptions[0].id;
      let invoice_number = null;

      // Generate invoice if payment is successful
      if (payment_status.toLowerCase() === "success") {
        const [rows] = await pool.promise().execute(
          `SELECT invoice_number FROM invoices 
         ORDER BY id DESC LIMIT 1`
        );

        let nextNumber = 1;
        if (rows.length > 0 && rows[0].invoice_number) {
          const last = rows[0].invoice_number;
          nextNumber = parseInt(last.split("-")[1]) + 1;
        }

        invoice_number = `INV-${String(nextNumber).padStart(5, "0")}`;

        // Insert into invoices table
        await pool.promise().execute(
          `INSERT INTO invoices (invoice_number, user_id, payment_status, subscription_status) 
         VALUES (?, ?, ?, ?)`,
          [invoice_number, user_id, payment_status, subscription_status]
        );
      }

      // Update payment_details with invoice_number if generated
      await pool.promise().execute(
        `UPDATE payment_details 
       SET payment_status = ?, subscription_status = ?, invoice_number = ? 
       WHERE id = ?`,
        [payment_status, subscription_status, invoice_number, paymentId]
      );

      // Update user subscription status
      await pool.promise().execute(
        `UPDATE users 
       SET subscription_status = ? 
       WHERE id = ?`,
        [subscription_status, user_id]
      );

      return res.status(200).json({
        success: true,
        message: `Subscription and payment updated.${
          invoice_number ? ` Invoice ${invoice_number} generated.` : ""
        }`,
        ...(invoice_number && { invoice_number }),
      });
    } catch (err) {
      console.error("Error updating subscription:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
