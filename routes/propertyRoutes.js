const express = require("express");
const router = express.Router();

const propertyController = require("../controllers/propertyController");

router.post("/addBasicDetails", propertyController.addBasicdetails);

module.exports = router;
