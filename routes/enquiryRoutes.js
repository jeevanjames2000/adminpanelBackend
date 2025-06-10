const express = require("express");
const router = express.Router();
const updateLastActive = require("../middleware/updateLoginActivity");

const enquiryController = require("../controllers/enquireController");
router.get("/getAllEnquiries", enquiryController.getAllEnquiries);
router.get("/getAllContactSellers", enquiryController.getAllContactSellers);
router.get(
  "/getAllContactSellersByFilter",
  enquiryController.getAllContactSellersByFilter
);
router.get("/getUserContactSellers", enquiryController.getUserContactSellers);
router.post("/postEnquiry", updateLastActive, enquiryController.postEnquiry);
router.post(
  "/contactSeller",
  updateLastActive,
  enquiryController.contactSeller
);
router.post(
  "/scheduleVisit",
  updateLastActive,
  enquiryController.scheduleVisit
);
router.post("/contactUs", updateLastActive, enquiryController.contactUs);
router.post("/sendLeadTextMessage", enquiryController.sendLeadTextMessage);
router.post("/userActivity", updateLastActive, enquiryController.userActivity);
router.get(
  "/getMostSearchedLocations",
  enquiryController.getMostSearchedLocations
);
router.get("/getCurrentActiveUsers", enquiryController.getCurrentActiveUsers);
router.get("/getAllEnqueriesCount", enquiryController.getAllEnqueriesCount);
router.get("/getPropertyEnquiries", enquiryController.getPropertyEnquiries);
router.get(
  "/getAllFavouritesByUserId",
  enquiryController.getAllFavouritesByUserId
);
module.exports = router;
