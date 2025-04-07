const express = require("express");
const router = express.Router();

const userController = require("../controllers/usersController");
router.get("/getAllUsersCount", userController.getAllUsersCount);
router.get("/getAllUsersByType", userController.getAllUsersByType);
router.get("/getAllEmp/:userID", userController.getAllEmp);
router.post("/createUser", userController.createUser);
router.post("/updateUser", userController.updateUser);
router.delete("/deleteUser", userController.deleteUser);
module.exports = router;
