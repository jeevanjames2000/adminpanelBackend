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

router.get("/getAllEmp/:userID", userController.getAllEmp);
router.get(
  "/getAllUsersUnder/:created_userID",
  userController.getAllUsersUnder
);

router.post("/createUser", userController.createUser);
router.post("/createEmployee", userController.createEmployee);
router.post("/updateUser", userController.updateUser);
router.delete("/deleteUser", userController.deleteUser);
router.get("/getProfile", userController.getProfileData);
router.post("/uploadUserImage", userController.uploadUserImage);
module.exports = router;
