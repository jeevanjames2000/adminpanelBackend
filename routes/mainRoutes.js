const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const mainController = require("../controllers/mainController");
router.get("/getUsers", mainController.getAllUsers);
router.get("/getAllLocalities", mainController.getAllLocalities);
router.get("/search", mainController.searchLocalities);
router.get("/terms", mainController.getTermsAndConditions);
router.post("/updateTerms", mainController.updateTermsAndConditions);
router.get("/privacy", mainController.getPrivacyPolicy);
router.post("/updatePrivacy", mainController.updatePrivacyPolicy);
router.get("/about", mainController.getAbout);
router.post("/updateAbout", mainController.updateAbout);
router.get("/services", mainController.getServices);
router.post("/updateServices", mainController.updateServices);
router.get("/careers", mainController.getCareers);
router.post("/insertCareer", mainController.insertCareer);
router.post("/updateCareer", mainController.updateCareer);
router.delete("/deleteCareer", mainController.deleteCareer);
router.get("/getAllPlaces", mainController.getAllPlaces);
router.get("/getAllStates", mainController.getAllStates);
router.get("/getAllCities", mainController.getAllCities);
router.post("/deletePlace", mainController.deletePlace);
router.post("/editPlace", mainController.editPlace);
router.post("/insertPlaces", mainController.insertPlace);
router.post(
  "/uploadPlacesExcell",
  upload.single("file"),
  mainController.insertPlacesExcell
);
router.get("/getPropertyLinks", mainController.getPropertyLinks);
router.post("/insertPropertyLink", mainController.insertPropertyLink);
router.post("/deletePropertyLink", mainController.deletePropertyLink);
router.post("/updatePropertyLink", mainController.updatePropertyLink);
module.exports = router;
