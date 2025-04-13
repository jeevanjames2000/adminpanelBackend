const express = require("express");
const router = express.Router();

const enquiryController = require("../controllers/enquireController");
router.get("/getAllEnquiries", enquiryController.getAllEnquiries);
router.get("/getAllContactSellers", enquiryController.getAllContactSellers);
router.post("/postEnquiry", enquiryController.postEnquiry);
router.post("/contactSeller", enquiryController.contactSeller);
router.post("/scheduleVisit", enquiryController.scheduleVisit);

module.exports = router;
