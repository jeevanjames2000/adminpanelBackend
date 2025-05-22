const express = require("express");
const router = express.Router();
const packageController = require("../controllers/packagesController");

router.get("/getAllPackages", packageController.getAllPackages);
router.get("/getAllSubscriptions", packageController.getAllSubscriptions);
router.get("/getSubscriptionDetails", packageController.getSubscriptionDetails);
router.post("/createSubscription", packageController.createSubscription);
router.post("/updateSubscription", packageController.updateSubscription);
router.get("/expiringSoon", packageController.expiringSoon);
router.post("/insertRules", packageController.insertRules);
router.post("/editRule", packageController.editRule);
router.delete("/deleteRule", packageController.deleteRule);
router.post(
  "/insertCustomPackageWithRules",
  packageController.insertCustomPackageWithRules
);
router.get("/getCustomPackages", packageController.getCustomPackages);
router.get("/getAllCustomPackages", packageController.getAllCustomPackages);
router.get("/getPackagePrice", packageController.getPackagePrice);
module.exports = router;
