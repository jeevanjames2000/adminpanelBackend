const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingsController");

router.get("/getAllListings", listingController.getAllProperties);
router.get("/getAllPropertiesByType", listingController.getAllPropertiesByType);
router.get("/getListingsByLimit", listingController.getListingsByLimit);
router.get("/getListingsFilters", listingController.getListingsFilters);
router.get("/getAllLeads", listingController.getAllLeadsByFilter);
router.get(
  "/getAllFloorPlans/:unique_property_id",
  listingController.getAllFloorPlans
);
router.post("/updateListing", listingController.updateListing);
router.post("/updateStatus", listingController.updateStatus);
router.delete("/deleteListing", listingController.deleteListing);
module.exports = router;
