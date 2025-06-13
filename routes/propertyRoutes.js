const express = require("express");
const router = express.Router();

const propertyController = require("../controllers/propertyController");

router.post("/addBasicDetails", propertyController.addBasicdetails);
router.post("/addPropertyDetails", propertyController.addPropertyDetails);
router.post("/addAddressDetails", propertyController.addAddressDetails);
router.post(
  "/addPropertyPhotosAndVideos",
  propertyController.addPropertyPhotosAndVideos
);
module.exports = router;
