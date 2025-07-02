const express = require("express");
const router = express.Router();
const liveController = require("../controllers/liveController");
router.get("/freshContacted", liveController.getFreshContactedLeads);
router.get("/getLiveNotifications", liveController.getAllLiveNotificationsSent);
module.exports = router;
