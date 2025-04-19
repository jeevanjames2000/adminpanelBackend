const express = require("express");
const router = express.Router();

const adsController = require("../controllers/adsController");
router.post("/uploadAdsImages", adsController.uploadAdsImages);
router.get("/getAdsImages", adsController.getAdsImages);
router.get("/getAds", adsController.getAds);
router.post("/deleteAdImage/:filename", adsController.deleteAdImage);
module.exports = router;
