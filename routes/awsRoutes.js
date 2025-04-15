const express = require("express");
const router = express.Router();
const uploader = require("../");
const awsController = require("../controllers/awsController");
const upload = require("../middleware/uploadMiddleware");

router.post("/uploadImage", upload.single("file"), awsController.uploadImage);
router.post("/uploadVideos", upload.single("file"), awsController.uploadVideo);
router.post(
  "/uploadAdImage",
  upload.single("file"),
  awsController.uploadAdImage
);
router.post("/uploadReel", upload.single("file"), awsController.uploadReel);
router.get("/getMedia/:id", awsController.getMediaById);
router.post("/deleteMedia/:id", awsController.deleteMediaById);
router.post(
  "/uploadUserImage",
  upload.single("image"),
  awsController.uploadUserImage
);
router.post(
  "/uploadPropertyImages",
  upload.array("images", 10),
  awsController.uploadPropertyImages
);
router.get("/getAllImages", awsController.getAllImages);
router.get("/getAlVideos", awsController.getAllVideos);
router.get("/getImagesById", awsController.getImagesById);
router.post(
  "/uploadAdVideo",
  upload.single("file"),
  awsController.uploadAdVideo
);
router.get("/getAllAdVideos", awsController.getAllAdVideos);

module.exports = router;
