require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const useragent = require("express-useragent");
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3003",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});
app.use(useragent.express());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3003",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
const noCacheMiddleware = (req, res, next) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  next();
};
const routes = [
  { path: "/auth/v1", route: require("./routes/authRoutes") },
  { path: "/api/v1", route: require("./routes/mainRoutes") },
  { path: "/user/v1", route: require("./routes/userRoutes") },
  {
    path: "/listings/v1",
    route: require("./routes/listingRoutes"),
    useCache: true,
  },
  {
    path: "/property/v1",
    route: require("./routes/propertyRoutes"),
    useCache: true,
  },
  { path: "/fav/v1", route: require("./routes/favRoutes") },
  { path: "/enquiry/v1", route: require("./routes/enquiryRoutes") },
  { path: "/awsS3/v1", route: require("./routes/awsRoutes") },
  { path: "/adAssets/v1", route: require("./routes/adsRoutes") },
  { path: "/packages/v1", route: require("./routes/packageRoute") },
  { path: "/payments", route: require("./routes/paymentRoutes") },
  { path: "/live", route: require("./routes/liveRoutes") },
];
routes.forEach(({ path, route, useCache }) => {
  app.use(path, useCache ? [noCacheMiddleware, route] : route);
});
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
require("./controllers/liveController").init(io);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const { pool } = require("./config/db");
process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Performing graceful shutdown...");
  server.close(() => {
    pool.end(() => {
      console.log("Database connection closed");
      process.exit(0);
    });
  });
});
