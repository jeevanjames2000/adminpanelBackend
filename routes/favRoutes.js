const express = require("express");
const router = express.Router();

const favController = require("../controllers/favouritesController");

router.get("/getAllFavourites", favController.getAllFavourites);
router.post("/postIntrest", favController.postIntrest);
router.delete("/deleteIntrest", favController.deleteIntrest);
module.exports = router;
