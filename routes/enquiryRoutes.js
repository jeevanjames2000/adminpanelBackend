const express = require("express");
const router = express.Router();

const enquiryController = require("../controllers/enquireController");
router.get("/getAllEnquiries", enquiryController.getAllEnquiries);
router.get("/getAllContactSellers", enquiryController.getAllContactSellers);
router.get(
  "/getAllContactSellersByFilter",
  enquiryController.getAllContactSellersByFilter
);
router.get("/getUserContactSellers", enquiryController.getUserContactSellers);
router.post("/postEnquiry", enquiryController.postEnquiry);
router.post("/contactSeller", enquiryController.contactSeller);
router.post("/scheduleVisit", enquiryController.scheduleVisit);
router.post("/contactUs", enquiryController.contactUs);
router.post("/sendLeadTextMessage", enquiryController.sendLeadTextMessage);
router.post("/userActivity", enquiryController.userActivity);
router.get(
  "/getMostSearchedLocations",
  enquiryController.getMostSearchedLocations
);
module.exports = router;
