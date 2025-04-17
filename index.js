require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Routes = require("./routes/mainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");
const favRoutes = require("./routes/favRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const awsRoutes = require("./routes/awsRoutes");
const app = express();

// Middleware
const allowedOrigins = [
  "https://testapi.meetowner.in",
  "https://preprod.meetowner.in",
  "https://admin.meetowner.in",
  "http://localhost:3002",
  "http://localhost:3001",
  "http://localhost:3003",
  "http://localhost:5173",
  "*",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders:
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(express.json());

// Main Routes
app.use("/auth/v1", authRoutes);

app.use("/api", Routes);
app.use("/user", userRoutes);
app.use("/listings", listingRoutes);
app.use("/fav", favRoutes);
app.use("/enquiry", enquiryRoutes);
app.use("/awsS3", awsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
