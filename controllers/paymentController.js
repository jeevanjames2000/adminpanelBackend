const razorpayInstance = require("./Razorpay");
const crypto = require("crypto");

module.exports = {
  createOrder: async (req, res) => {
    try {
      const { amount, currency } = req.body;
      const options = {
        amount: amount * 100,
        currency: currency || "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1,
      };
      const order = await razorpayInstance.orders.create(options);
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const secret = process.env.RAZORPAY_SECRET;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }
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
      console.log("Webhook verified", req.body);
      res.json({ success: true });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }
  },
};
