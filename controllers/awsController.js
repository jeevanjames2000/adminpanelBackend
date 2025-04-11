const { Upload } = require("@aws-sdk/lib-storage");
const {
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");
const path = require("path");
const pool = require("../config/db");

const { v4: uuidv4 } = require("uuid");
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const mediaStore = {};
const uploadToS3 = async (buffer, mimetype, key) => {
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };
  const upload = new Upload({
    client: s3,
    params: uploadParams,
  });
  await upload.done();
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return url;
};
module.exports = {
  uploadImage: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const { id, key, url } = await uploadToS3(req.file, "images");
      mediaStore[id] = { id, type: "image", key, url };
      res.status(200).json({ message: "Image uploaded", id, url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
  uploadVideo: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const { id, key, url } = await uploadToS3(req.file, "videos");
      mediaStore[id] = { id, type: "video", key, url };
      res.status(200).json({ message: "Video uploaded", id, url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
  uploadReel: async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const { id, key, url } = await uploadToS3(req.file, "reels");
      mediaStore[id] = { id, type: "reel", key, url };
      res.status(200).json({ message: "Reel uploaded", id, url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  },
  getMediaById: async (req, res) => {
    const id = req.params.id;
    const file = mediaStore[id];
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    res.status(200).json(file);
  },
  deleteMediaById: async (req, res) => {
    const id = req.params.id;
    const file = mediaStore[id];
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.key,
      });
      await s3.send(command);
      delete mediaStore[id];
      res.status(200).json({ message: "File deleted successfully", id });
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Delete failed" });
    }
  },
  getAllImages: async (req, res) => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: "images/",
      });
      const data = await s3.send(command);
      const imageUrls = (data.Contents || []).map((item) => {
        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`;
      });
      res.status(200).json({ images: imageUrls });
    } catch (err) {
      console.error("Error getting images:", err);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  },
  getAllVideos: async (req, res) => {
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: "videos/",
      });
      const data = await s3.send(command);
      const videoUrls = (data.Contents || []).map((item) => {
        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`;
      });
      res.status(200).json({ videos: videoUrls });
    } catch (err) {
      console.error("Error getting videos:", err);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  },
  uploadUserImage: async (req, res) => {
    const { user_id } = req.body;
    const file = req.file;
    if (!user_id || !file) {
      return res.status(400).json({ message: "Missing user_id or file" });
    }

    const ext = path.extname(file.originalname || "");
    const key = `images/${user_id}/${Date.now()}${ext}`;

    try {
      const url = await uploadToS3(file.buffer, file.mimetype, key);

      pool.query(
        "UPDATE users SET photo = ? WHERE id = ?",
        [url, user_id],
        (err, results) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database update failed" });
          }

          return res.status(200).json({ message: "User image uploaded", url });
        }
      );
    } catch (err) {
      console.error("User image upload failed:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  },
  uploadPropertyImages: async (req, res) => {
    const { user_id, property_id } = req.body;
    const files = req.files;

    if (!user_id || !property_id || !files?.length) {
      return res
        .status(400)
        .json({ message: "Missing user_id, property_id or files" });
    }

    try {
      const uploadPromises = files.map((file) => {
        const ext = path.extname(file.originalname);
        const key = `images/${user_id}/${property_id}/${Date.now()}-${
          file.originalname
        }`;
        return uploadToS3(file.buffer, file.mimetype, key);
      });

      const urls = await Promise.all(uploadPromises);
      const representativeImage = urls[0];

      // 👇 Callback-based DB query
      pool.query(
        "UPDATE properties SET property_image = ? WHERE unique_property_id = ?",
        [representativeImage, property_id],
        (err, results) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database update failed" });
          }

          res.status(200).json({ message: "Property images uploaded", urls });
        }
      );
    } catch (err) {
      console.error("Property images upload failed:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  },
  getImagesById: async (req, res) => {
    const { user_id, unique_property_id } = req.body;
    if (!user_id && !unique_property_id) {
      return res
        .status(400)
        .json({ message: "Please provide user_id or unique_property_id" });
    }
    let prefix = "images/";
    if (user_id && unique_property_id) {
      prefix = `images/${user_id}/${unique_property_id}/`;
    } else if (user_id) {
      prefix = `images/${user_id}/`;
    } else {
      return res
        .status(400)
        .json({ message: "user_id is required if using unique_property_id" });
    }
    try {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
      });
      const data = await s3.send(command);
      const imageUrls = (data.Contents || []).map((item) => {
        return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`;
      });
      res.status(200).json({ images: imageUrls });
    } catch (err) {
      console.error("Error fetching images by ID:", err);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  },
};
