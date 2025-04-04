const express = require("express");
const router = express.Router();

const mainController = require("../controllers/mainController");

router.get("/getUsers", mainController.getAllUsers);
router.get("/search", mainController.searchLocalities);
module.exports = router;
