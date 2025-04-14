const express = require("express");
const router = express.Router();

const mainController = require("../controllers/mainController");

router.get("/getUsers", mainController.getAllUsers);
router.get("/search", mainController.searchLocalities);
router.get("/terms", mainController.getTermsAndConditions);
router.get("/privacy", mainController.getPrivacyPolicy);
router.get("/services", mainController.getServices);
router.get("/careers", mainController.getCareers);

module.exports = router;
