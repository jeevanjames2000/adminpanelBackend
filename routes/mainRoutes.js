const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const mainController = require("../controllers/mainController");

router.get("/getUsers", mainController.getAllUsers);
router.get("/search", mainController.searchLocalities);
router.get("/terms", mainController.getTermsAndConditions);
router.get("/privacy", mainController.getPrivacyPolicy);
router.get("/services", mainController.getServices);
router.get("/careers", mainController.getCareers);
router.get("/getAllPlaces", mainController.getAllPlaces);
router.post("/deletePlace", mainController.deletePlace);
router.post("/editPlace", mainController.editPlace);
router.post("/insertPlaces", mainController.insertPlace);
router.get("/getAllStates", mainController.getAllStates);
router.get("/getAllCities", mainController.getAllCities);
router.post("/insertCareer", mainController.insertCareer);
router.delete("/deleteCareer", mainController.deleteCareer);
router.post("/updateCareer", mainController.updateCareer);
router.post(
  "/uploadPlacesExcell",
  upload.single("file"),
  mainController.insertPlacesExcell
);

module.exports = router;
