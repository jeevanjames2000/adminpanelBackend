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
app.use(cors({ origin: "*" }));
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
