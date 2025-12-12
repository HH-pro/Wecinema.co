const jwt = require("jsonwebtoken");
const Mongoose = require("mongoose");
const Listing = require("../../backend/src/models/marketplace/listing");
const User = require("../../backend/src/models/user"); // 🆕 ADD THIS

const authenticateMiddleware = async (req, res, next) => {
  try {
    console.log("🔐 Authentication middleware triggered");
    console.log("Headers:", req.headers);
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("❌ No token found in Authorization header");
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log("❌ Token is empty");
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    console.log("✅ Token found, verifying...");
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log("✅ Token verified. User ID:", decoded.userId);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log("❌ User not found for ID:", decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log("✅ User found:", user._id, user.email);
    
    // Attach user to request
    req.user = {
      _id: user._id,
      id: user._id, // Add both _id and id for compatibility
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin,
      // Add any other user fields you need
    };
    
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
// 🆕 HYPEMODE USER MIDDLEWARE
const isHypeModeUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.isHypeModeUser) {
      return res.status(403).json({ 
        error: 'Access denied. HypeMode subscription required for marketplace features.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('HypeMode check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
// In your utils.js - Fix isSeller middleware
const isSeller = (req, res, next) => {
  try {
    console.log('=== IS SELLER MIDDLEWARE ===');
    console.log('req.user:', req.user);
    
    // Check if req.user exists and has the required properties
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has seller role or permissions
    // Adjust this based on your user model structure
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Seller role required.' });
    }

    console.log('User is seller, proceeding...');
    next();
  } catch (error) {
    console.log('isSeller middleware error:', error);
    res.status(500).json({ error: 'Server error in seller verification' });
  }
};

// 🆕 BUYER MIDDLEWARE
const isBuyer = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.role !== 'buyer' && user.role !== 'both') {
      return res.status(403).json({ 
        error: 'Access denied. Buyer account required to make purchases.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Buyer check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Ensure Owner Middleware
const ensureOwner = async (req, res, next) => {
	try {
		const listing = await Listing.findById(req.params.id || req.body.listingId);
		if (!listing) return res.status(404).json({ message: "Listing not found" });

		if (listing.owner.toString() !== req.user.id) {
			return res.status(403).json({ message: "Forbidden" });
		}

		req.listing = listing; // pass listing forward
		next();
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Server error" });
	}
};

// ✅ Check if user is admin
const isAdmin = (req, res, next) => {
	if (!req.user) {
		return res.status(401).json({ error: "Unauthorized: User not authenticated" });
	}

	// Uncomment if role-based restriction is needed
	// if (req.user.role !== "admin") {
	//   return res.status(403).json({ error: "Unauthorized: Admin access required" });
	// }

	next();
};

// ✅ Function to check if the ID is a valid ObjectId
const isValidObject = (id) => {
	if (!id || typeof id !== "string" || id.length !== 24) {
		return false;
	}
	return Mongoose.Types.ObjectId.isValid(id);
};

function isValidObjectId(id) {
	if (!id) return false;

	try {
		const objectId = new Mongoose.Types.ObjectId(id);
		return String(objectId) === id;
	} catch (error) {
		console.log(error);
		return false;
	}
}

// ✅ WhatsApp Alert Function (Twilio)
const sendWhatsAppAlert = async (message) => {
	try {
		const res = await client.messages.create({
			body: message,
			from: "whatsapp:+14155238886", // Twilio sandbox number
			to: "whatsapp:+923117836704",  // Your verified WhatsApp number
		});
		console.log("WhatsApp Alert Sent:", res.sid);
	} catch (error) {
		console.error("Failed to send WhatsApp Alert:", error.message);
	}
};

module.exports = {
	authenticateMiddleware,
	protect,
	ensureOwner,
	isValidObjectId,
	isValidObject,
	isAdmin,
	sendWhatsAppAlert,
	// 🆕 NEW MIDDLEWARES
	isHypeModeUser,
	isSeller,
	isBuyer
};