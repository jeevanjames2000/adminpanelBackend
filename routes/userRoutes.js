const express = require("express");
const router = express.Router();

const userController = require("../controllers/usersController");
router.get("/getAllUsersCount", userController.getAllUsersCount);
router.get("/getAllUsersByType", userController.getAllUsersByType);
module.exports = router;
