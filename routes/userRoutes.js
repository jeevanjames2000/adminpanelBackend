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
router.get("/getAllEmp/:userID", userController.getAllEmp);
router.post(
  "/createUser",
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload error" });
      } else if (err) {
        console.error("Unknown error:", err);
        return res.status(500).json({ message: "Server error" });
      }
      next();
    });
  },
  userController.createUser
);
router.post("/updateUser", userController.updateUser);
router.delete("/deleteUser", userController.deleteUser);

module.exports = router;
