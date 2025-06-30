require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Routes = require("./routes/mainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const favRoutes = require("./routes/favRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const awsRoutes = require("./routes/awsRoutes");
const adRoutes = require("./routes/adsRoutes");
const packages = require("./routes/packageRoute");
const paymentRoutes = require("./routes/paymentRoutes");
const useragent = require("express-useragent");
const app = express();
const path = require("path");
app.use(useragent.express());
// require("./cronJobs");
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: [
      "http://localhost:3003",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    credentials: true,
  })
);
const noCacheMiddleware = (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

app.use("/property/v1", noCacheMiddleware);
app.use("/listings/v1", noCacheMiddleware);
app.use("/auth/v1", authRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/v1", Routes);
app.use("/user/v1", userRoutes);
app.use("/listings/v1", listingRoutes);
app.use("/property/v1", propertyRoutes);
app.use("/fav/v1", favRoutes);
app.use("/enquiry/v1", enquiryRoutes);
app.use("/awsS3/v1", awsRoutes);
app.use("/adAssets/v1", adRoutes);
app.use("/packages/v1", packages);
app.use("/payments", paymentRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
