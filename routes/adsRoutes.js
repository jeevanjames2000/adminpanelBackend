const express = require("express");
const router = express.Router();

const adsController = require("../controllers/adsController");
router.post("/uploadSliderImages", adsController.uploadSliderImages);
router.get("/getSliderImages", adsController.getSliderImages);
router.get("/getAds", adsController.getAds);
router.post("/deleteAdImage", adsController.deleteAdImage);
router.get("/getAllAds", adsController.getAllAds);
router.post("/postAdDetails", adsController.postAdDetails);
router.get("/getAdDetails", adsController.getAdDetails);
module.exports = router;
