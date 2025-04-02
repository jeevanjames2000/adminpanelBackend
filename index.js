require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Routes = require("./routes/mainRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const listingRoutes = require("./routes/listingRoutes");
const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Main Routes
app.use("/auth/v1", authRoutes);
app.use("/api", Routes);
app.use("/user", userRoutes);
app.use("/listings", listingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
