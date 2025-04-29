const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
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
  getAllAds: (req, res) => {
    try {
      const query = `SELECT id, unique_property_id,property_name,property_cost,other_info,property_type,
      sub_type,property_for,location_id,google_address FROM properties WHERE other_info IS NOT NULL AND other_info != '' ORDER BY id ASC`;
      pool.query(query, [], (err, results) => {
        if (err) {
          console.error("Error fetching properties:", err);
          return res.status(500).json({ error: "Database query failed" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No properties found" });
        }
        res.status(200).json({
          results: results,
        });
      });
    } catch (error) {
      console.error("Error fetching random properties:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  postAdDetails: (req, res) => {
    try {
      const {
        unique_property_id,
        property_name,
        ads_page,
        ads_order,
        start_date,
        end_date,
        city,
        image,
        display_cities,
        ads_title,
        ads_button_text,
        ads_button_link,
        ads_description,
        user_id,
        property_type,
        sub_type,
        property_for,
        property_cost,
        property_in,
        google_address,
      } = req.body;
      if (!unique_property_id || !property_name) {
        return res.status(400).json({
          message: "unique_property_id and property_name are required",
        });
      }
      const created_date = moment().format("YYYY-MM-DD");
      const created_time = moment().format("HH:mm:ss");
      const status = 1;
      const insertQuery = `
      INSERT INTO ads_details (
        unique_property_id, property_name, ads_page, ads_order, 
        start_date, end_date, created_date, created_time, 
        status, city, image, display_cities, ads_title, 
        ads_button_text, ads_button_link, ads_description, 
        user_id, property_type, sub_type, property_for, 
        property_cost, property_in, google_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
      const values = [
        unique_property_id || null,
        property_name || null,
        ads_page || null,
        ads_order || null,
        start_date || null,
        end_date || null,
        created_date,
        created_time,
        status,
        city || null,
        image || null,
        display_cities || null,
        ads_title || null,
        ads_button_text || null,
        ads_button_link || null,
        ads_description || null,
        user_id || null,
        property_type || null,
        sub_type || null,
        property_for || null,
        property_cost || null,
        property_in || null,
        google_address || null,
      ];
      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Error inserting ad details:", err);
          return res.status(500).json({ error: "Database error" });
        }
        return res
          .status(200)
          .json({ message: "Ad inserted successfully", id: result.insertId });
      });
    } catch (error) {
      console.error("Error in postAdDetails API:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  getAdDetails: (req, res) => {
    try {
      const { city, status } = req.query;
      let baseQuery = `SELECT * FROM ads_details WHERE 1`;
      const queryParams = [];
      if (city) {
        baseQuery += ` AND city = ?`;
        queryParams.push(city);
      }
      if (status) {
        baseQuery += ` AND status = ?`;
        queryParams.push(status);
      }
      baseQuery += ` ORDER BY ads_order ASC`;
      pool.query(baseQuery, queryParams, (err, results) => {
        if (err) {
          console.error("Error fetching ad details:", err);
          return res.status(500).json({ error: "Database error" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "No ads found" });
        }
        return res.status(200).json({ ads: results });
      });
    } catch (error) {
      console.error("Error in getAdDetails API:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
