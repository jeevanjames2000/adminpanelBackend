const express = require("express");
const router = express.Router();

const enquiryController = require("../controllers/enquireController");
router.get("/getAllEnquiries", enquiryController.getAllEnquiries);
router.get("/getAllContactSellers", enquiryController.getAllContactSellers);
router.post("/postIntrest", enquiryController.postEnquiry);
router.post("/contactSeller", enquiryController.contactSeller);

module.exports = router;
