const jwt = require("jsonwebtoken");
const Mongoose = require("mongoose");
const Listing = require("../");

// ✅ Authenticate Middleware (basic token validation)
const authenticateMiddleware = (req, res, next) => {
	let token = req.headers.authorization;
	token = token?.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Unauthorized: No token provided" });
	}

	const SECRET_KEY = process.env.JWT_SECRET || "weloremcium.secret_key"; // use env if available

	// Verify the token
	jwt.verify(token, SECRET_KEY, (err, decoded) => {
		if (err) {
			console.log(err);
			return res.status(401).json({ error: "Unauthorized: Invalid token" });
		}

		// Check if the token has expired
		const currentTimestamp = Math.floor(Date.now() / 1000);
		if (decoded.exp < currentTimestamp) {
			return res.status(401).json({ error: "Unauthorized: Token has expired" });
		}

		// Attach the user information to the request object for further use
		req.user = { id: decoded.id, email: decoded.email, role: decoded.role };

		// Continue to the next middleware or route handler
		next();
	});
};

// ✅ Alternative Protect Middleware (simpler version)
const protect = (req, res, next) => {
	const auth = req.headers.authorization;
	if (!auth || !auth.startsWith("Bearer ")) {
		return res.status(401).json({ message: "No token" });
	}

	const token = auth.split(" ")[1];
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || "weloremcium.secret_key");
		req.user = { id: payload.id, email: payload.email, role: payload.role };
		return next();
	} catch (err) {
		return res.status(401).json({ message: "Token invalid" });
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
};
