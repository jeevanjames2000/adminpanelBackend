const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packagesController");

router.get("/getAllPackages", packageController.getAllPackages);
router.get("/getAllSubscriptions", packageController.getAllSubscriptions);
router.get("/getSubscriptionDetails", packageController.getSubscriptionDetails);
router.post("/createSubscription", packageController.createSubscription);
router.post("/updateSubscription", packageController.updateSubscription);

module.exports = router;
