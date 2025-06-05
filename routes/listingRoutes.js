const express = require("express");
const router = express.Router();
const updateLastActive = require("../middleware/updateLoginActivity");

const listingController = require("../controllers/listingsController");

router.get("/getAllListings", listingController.getAllProperties);
router.get("/getSinleProperty", listingController.getSingleProperty);
router.get("/getAllPropertiesByType", listingController.getAllPropertiesByType);
router.get("/getAllListingsByType", listingController.getAllListingsByType);

router.get("/getListingsByLimit", listingController.getListingsByLimit);
router.get("/getListingsFilters", listingController.getListingsFilters);
router.get("/getAllLeads", listingController.getAllLeadsByFilter);
router.get(
  "/getAllFloorPlans/:unique_property_id",
  listingController.getAllFloorPlans
);
router.get("/getAroundThisProperty", listingController.getAroundThisProperty);
router.get("/getRandomPropertiesAds", listingController.getRandomPropertiesAds);
router.get("/getPropertiesByUserID", listingController.getPropertiesByUserID);
router.get("/getPropertyActivity", listingController.getPropertyActivity);
router.get("/getLatestProperties", listingController.getLatestProperties);
router.get("/getBestDeals", listingController.getBestDeals);
router.get("/getBestMeetowner", listingController.getBestMeetOwner);
router.get("/getMeetOwnerExclusive", listingController.getMeetOwnerExclusive);
router.get("/getRecomendedSellers", listingController.getRecomendedSellers);
router.get(
  "/getMostPropertiesSeller",
  listingController.getMostPropertiesSeller
);
router.get("/getHighDemandProjects", listingController.getHighDemandProjects);
router.get("/getAllPropertyViews", listingController.getAllPropertyViews);
router.post("/updateListing", listingController.updateListing);
router.post(
  "/propertyViewed",
  updateLastActive,
  listingController.propertyViewed
);
router.post("/updateStatus", listingController.updateStatus);
router.delete("/deleteListing", listingController.deleteListing);
module.exports = router;
