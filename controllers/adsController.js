const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const adAssetsDir = "./uploads";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(adAssetsDir)) {
      fs.mkdirSync(adAssetsDir, { recursive: true });
    }
    cb(null, adAssetsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
module.exports = {
  uploadAdsImages: [
    upload.single("photo"),
    (req, res) => {
      const { property_id, order, user_id } = req.body;
      const videoUrl = `uploads/${req.file.filename}`;
      const query = `
        INSERT INTO ad_videos (id,video_url, ad_order, property_id, user_id, created_date)
        VALUES (?,?, ?, ?, ?, NOW())
      `;
      const id = uuidv4();
      pool.query(
        query,
        [id, videoUrl, order, property_id, user_id],
        (err, result) => {
          if (err) {
            console.error("Error inserting video data:", err);
            return res
              .status(500)
              .json({ message: "Error saving video data to database" });
          }
          res.status(200).json({
            message: "Video uploaded and saved to database successfully",
            videoUrl,
            ad_video_id: result.insertId,
          });
        }
      );
    },
  ],
  getAdsImages: (req, res) => {
    const dirPath = path.join(__dirname, "../uploads");
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return res.status(500).json({ message: "Failed to read images" });
      }
      const images = files.map((file) => `/uploads/${file}`);
      res.status(200).json({ images });
    });
  },
  deleteAdImage: (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../uploads", filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delete image:", err);
        return res.status(500).json({ message: "Failed to delete image" });
      }
      res.status(200).json({ message: "Image deleted successfully" });
    });
  },
  getAds: (req, res) => {
    const query = "SELECT * FROM ad_videos";
    pool.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching ads:", err);
        return res.status(500).json({ message: "Error fetching ads" });
      }

      res.status(200).json({
        message: "Ads fetched successfully",
        ads: results,
      });
    });
  },
};
