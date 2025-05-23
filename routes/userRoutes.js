const express = require("express");
const router = express.Router();
const multer = require("multer");

const storage = multer.memoryStorage(); // ✅ must use this

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 5MB
}).single("photo");
const userController = require("../controllers/usersController");

router.get("/getAllUsersCount", userController.getAllUsersCount);
router.get("/getAllUsersByType", userController.getAllUsersByType);
router.get("/getAllUsersByTypeSearch", userController.getAllUsersByTypeSearch);
router.get(
  "/getAllEmployeesByTypeSearch",
  userController.getAllEmployeesByTypeSearch
);
router.get("/getAllEmp/:userID", userController.getAllEmp);
router.get(
  "/getAllUsersUnder/:created_userID",
  userController.getAllUsersUnder
);

router.post("/createUser", userController.createUser);
router.post("/createEmployee", userController.createEmployee);
router.post("/updateEmployee", userController.updateEmployee);
router.post("/assignEmployee", userController.assignEmployee);
router.delete("/deleteEmployee", userController.deleteEmployee);
router.post("/updateUser", userController.updateUser);
router.delete("/deleteUser", userController.deleteUser);
router.get("/getProfile", userController.getProfileData);
router.post("/uploadUserImage", userController.uploadUserImage);
router.post("/insertToken", userController.insertOrUpdateToken);
router.get("/getAllTokens", userController.getTokens);
router.post("/notify-user", userController.sendToSingleUser);
router.post("/notify-all", userController.sendToAllUsers);
router.get(
  "/getAllNotificationHistory",
  userController.getAllNotificationHistory
);
router.post("/createShorts", userController.createShorts);
router.get("/getAllShorts", userController.getAllShorts);
module.exports = router;
