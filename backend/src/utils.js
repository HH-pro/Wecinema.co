const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Listing = require("../src/models/marketplace/listing"); // ✅ fix path according to your structure

// 🔑 Secret Key
const SECRET_KEY = process.env.JWT_SECRET || "weloremcium.secret_key";

/**
 * ✅ Authenticate Middleware (advanced validation)
 */
const authenticateMiddleware = (req, res, next) => {
  let token = req.headers.authorization;
  token = token?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error("JWT Verify Error:", err);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Check expiration
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTimestamp) {
      return res.status(401).json({ error: "Unauthorized: Token expired" });
    }

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  });
};

/**
 * ✅ Protect Middleware (simpler version)
 */
const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    console.error("JWT Error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * ✅ Ensure Listing Owner Middleware
 */
const ensureOwner = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id || req.body.listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.listing = listing; // attach to request
    next();
  } catch (error) {
    console.error("EnsureOwner Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Admin Check Middleware
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: User not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

/**
 * ✅ ObjectId Validation
 */
const isValidObject = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

function isValidObjectId(id) {
  if (!id) return false;
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    return String(objectId) === id;
  } catch {
    return false;
  }
}

module.exports = {
  authenticateMiddleware,
  protect,
  ensureOwner,
  isAdmin,
  isValidObject,
  isValidObjectId,
};
