const express = require("express");
const router = express.Router();
const updateLastActive = require("../middleware/updateLoginActivity");

const authController = require("../controllers/authController");

router.post("/login", authController.login);
router.post("/loginAgent", authController.loginAgents);
router.post("/sendGallaboxOTP", authController.sendGallaboxOTP);
router.get("/sendOtp", authController.sendOtp);
router.post("/sendWhatsappLeads", authController.sendWhatsappLeads);
router.post("/loginnew", authController.AuthLoginNew);
router.post("/registernew", authController.AuthRegisterNew);
router.post("/register", authController.AuthRegister);
router.post("/loginActivity", updateLastActive, authController.LoginActivity);
module.exports = router;
