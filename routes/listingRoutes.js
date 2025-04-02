const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingsController");

router.get("/getAllListings", listingController.getAllProperties);
router.get("/getListingsByLimit", listingController.getListingsByLimit);
router.get("/getListingsFilters", listingController.getListingsFilters);
router.post("/updateListing", listingController.updateListing);
router.post("/updateStatus", listingController.updateStatus);
router.delete("/deleteListing", listingController.deleteListing);
module.exports = router;
