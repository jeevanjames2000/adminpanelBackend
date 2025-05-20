const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/createOrder", paymentController.createOrder);
router.post("/verifyPayment", paymentController.verifyPayment);
router.post("/checkSubscription", paymentController.checkSubscription);
router.post("/updateSubscription", paymentController.updateSubscription);
router.post("/razorpayWebhook", paymentController.razorpayWebhook);
router.post("/createPaymentLink", paymentController.createPaymentLink);
router.post("/verifyPaymentLink", paymentController.verifyPaymentLink);
router.get("/getPaymentDetailsByID", paymentController.getPaymentDetailsByID);
router.get("/getInvoiceByID", paymentController.getInvoiceByID);
router.get("/getAllInvoicesByID", paymentController.getAllInvoicesByID);
router.get("/expiringSoonPackage", paymentController.expiringSoonPackage);
router.get("/getAllExpiringSoon", paymentController.getAllExpiringSoon);

// router.post("/sendWhatsappLeads", paymentController.sendWhatsappLeads);
module.exports = router;
