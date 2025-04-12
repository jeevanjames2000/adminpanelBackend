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
router.get("/getRandomPropertiesAds", listingController.getRandomPropertiesAds);
router.get("/getPropertiesByUserID", listingController.getPropertiesByUserID);
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
router.post("/updateListing", listingController.updateListing);
router.post("/updateStatus", listingController.updateStatus);
router.delete("/deleteListing", listingController.deleteListing);
module.exports = router;
