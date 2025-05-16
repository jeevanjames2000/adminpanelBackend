const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const adAssetsDir = "./uploads/adAssets";
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
// Folder for dynamic assets
const dynamicAssetsDir = "./uploads/dynamicAssets";

// Configure storage for dynamic assets
const dynamicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(dynamicAssetsDir)) {
      fs.mkdirSync(dynamicAssetsDir, { recursive: true });
    }
    cb(null, dynamicAssetsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const dynamicUpload = multer({ storage: dynamicStorage });

module.exports = {
  uploadSliderImages: [
    upload.single("photo"),
    (req, res) => {
      const {
        unique_property_id,
        property_name,
        ads_page,
        ads_order,
        start_date,
        end_date,
        city,
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
      const created_date = moment().format("YYYY-MM-DD");
      const created_time = moment().format("HH:mm:ss");
      const status = 1;
      const videoUrl = req.file
        ? `uploads/adAssets/${req.file.filename}`
        : null;
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
        videoUrl,
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
    },
  ],
  getSliderImages: (req, res) => {
    const dirPath = path.join(__dirname, "../uploads/adAssets");
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return res.status(500).json({ message: "Failed to read images" });
      }
      const images = files.map((file) => `/uploads/adAssets/${file}`);
      res.status(200).json({ images });
    });
  },
  deleteAdImage: (req, res) => {
    const ads_page = (req.query.ads_page || "").trim().toLowerCase();
    const property_name = (req.query.property_name || "").trim();
    const unique_property_id = (req.query.unique_property_id || "").trim();
    if (!ads_page) {
      return res
        .status(400)
        .json({ message: "ads_page query param is required" });
    }
    if (ads_page === "main_slider") {
      if (!property_name) {
        return res
          .status(400)
          .json({ message: "property_name is required for main_slider" });
      }
      const selectQuery = `SELECT image FROM ads_details WHERE ads_page = ? AND property_name = ? LIMIT 1`;
      pool.query(
        selectQuery,
        [ads_page, property_name],
        (selectErr, results) => {
          if (selectErr) {
            console.error("Error finding ad:", selectErr);
            return res
              .status(500)
              .json({ message: "Database error while finding ad" });
          }
          if (results.length === 0) {
            return res
              .status(404)
              .json({ message: "Ad not found in database" });
          }
          const imagePathFromDB = results[0].image;
          const filename = imagePathFromDB.split("/").pop();
          const filePath = path.join(
            __dirname,
            "../uploads/adAssets",
            filename
          );
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== "ENOENT") {
              console.error("File deletion error:", unlinkErr);
              return res
                .status(500)
                .json({ message: "Failed to delete image file" });
            }
            const deleteQuery = `DELETE FROM ads_details WHERE ads_page = ? AND property_name = ?`;
            pool.query(deleteQuery, [ads_page, property_name], (deleteErr) => {
              if (deleteErr) {
                console.error("DB delete error:", deleteErr);
                return res
                  .status(500)
                  .json({ message: "Failed to delete ad from database" });
              }
              return res.status(200).json({
                message: "Main slider ad and image deleted successfully",
              });
            });
          });
        }
      );
    } else {
      if (!unique_property_id || !property_name) {
        return res.status(400).json({
          message:
            "unique_property_id and property_name are required for non-main_slider ads",
        });
      }
      const deleteQuery = `
        DELETE FROM ads_details 
        WHERE unique_property_id = ? AND property_name = ? AND ads_page = ?
      `;
      pool.query(
        deleteQuery,
        [unique_property_id, property_name, ads_page],
        (err, result) => {
          if (err) {
            console.error("DB delete error:", err);
            return res
              .status(500)
              .json({ message: "Failed to delete ad from database" });
          }
          if (result.affectedRows === 0) {
            return res
              .status(404)
              .json({ message: "Ad not found with given identifiers" });
          }
          return res
            .status(200)
            .json({ message: "Ad deleted from database (no image involved)" });
        }
      );
    }
  },
  getAds: (req, res) => {
    const ads_page = (req.query.ads_page || "").trim().toLowerCase();
    let query = "";
    let queryParams = [];
    if (ads_page === "all_ads") {
      query = "SELECT * FROM ads_details";
    } else if (ads_page) {
      query = "SELECT * FROM ads_details WHERE ads_page = ?";
      queryParams = [ads_page];
    } else {
      return res
        .status(400)
        .json({ message: "ads_page query param is required" });
    }
    pool.query(query, queryParams, async (err, adsResults) => {
      if (err) {
        console.error("Error fetching ads:", err);
        return res.status(500).json({ message: "Error fetching ads" });
      }
      try {
        const enrichedAds = await Promise.all(
          adsResults.map((ad) => {
            return new Promise((resolve, reject) => {
              const propertyQuery = `
                SELECT * FROM properties 
                WHERE unique_property_id = ?
              `;
              pool.query(
                propertyQuery,
                [ad.unique_property_id],
                (propErr, propResults) => {
                  if (propErr) {
                    console.error(
                      `Error fetching property for ad_id ${ad.id}:`,
                      propErr
                    );
                    return reject(propErr);
                  }
                  ad.property_data = propResults[0] || null;
                  resolve(ad);
                }
              );
            });
          })
        );
        const shuffledAds = enrichedAds.sort(() => 0.5 - Math.random());
        res.status(200).json({
          message: "Ads with selected property data fetched successfully",
          ads: shuffledAds,
        });
      } catch (error) {
        console.error("Error fetching property data:", error);
        return res
          .status(500)
          .json({ message: "Error fetching related property data" });
      }
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
  uploadDynamicAssets: [
    dynamicUpload.single("asset"),
    (req, res) => {
      const {
        asset_type, // e.g., splash, header, icon
        screen_name, // optional - which screen it belongs to
        description,
        uploaded_by,
      } = req.body;

      const created_date = moment().format("YYYY-MM-DD");
      const created_time = moment().format("HH:mm:ss");

      const assetPath = req.file
        ? `uploads/dynamicAssets/${req.file.filename}`
        : null;

      const insertQuery = `
        INSERT INTO dynamic_assets (
          asset_type, screen_name, description, file_path,
          created_date, created_time, uploaded_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        asset_type || null,
        screen_name || null,
        description || null,
        assetPath,
        created_date,
        created_time,
        uploaded_by || null,
      ];

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Error inserting dynamic asset:", err);
          return res.status(500).json({ error: "Database error" });
        }
        return res.status(200).json({
          message: "Dynamic asset uploaded successfully",
          id: result.insertId,
          path: assetPath,
        });
      });
    },
  ],
  getDynamicAssets: (req, res) => {
    const { screen_name, asset_type } = req.query;

    let query = `SELECT * FROM dynamic_assets WHERE 1`;
    const values = [];

    if (screen_name) {
      query += ` AND screen_name = ?`;
      values.push(screen_name);
    }

    if (asset_type) {
      query += ` AND asset_type = ?`;
      values.push(asset_type);
    }

    query += ` ORDER BY created_date DESC, created_time DESC`;

    pool.query(query, values, (err, results) => {
      if (err) {
        console.error("Error fetching dynamic assets:", err);
        return res.status(500).json({ error: "Database error" });
      }

      return res.status(200).json({
        message: "Dynamic assets fetched successfully",
        assets: results,
      });
    });
  },
};
