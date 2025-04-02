const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "khsfskhfks983493123!@#JSFKORuiweo232";

module.exports = {
  verifyToken: async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied, no token provided" });
    }

    try {
      const decoded = jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  },
};
