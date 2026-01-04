const express = require("express");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const {
  VideoController,
  UserController,
  domainController,
  sentryRouter,
  listingRoutes,
  orderRoutes, 
  offerRoutes,
  chatRoutes,  // ✅ This is what you imported
  paymentRoutes,
  stripeRoutes,
} = require("./controller");

const connectDB = require("./config/config");
const morgan = require("morgan");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
require("../services/expirationService");

const app = express();

// ✅ Initialize Sentry
Sentry.init({
  dsn: "https://ffba1b70eb56e50557f3a75a5899e7ab@o4509361947148288.ingest.us.sentry.io/4509361953177600",
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0, // Adjust in production
});

// ✅ Request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Security headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(morgan("dev"));

// 🆕 STRIPE WEBHOOK KE LIYE IMPORTANT: Raw body parser pehle use karein
app.use("/webhook/stripe", express.raw({type: 'application/json'})); // 🆕 Stripe webhook ke liye

// Baaki sab routes ke liye JSON parser
app.use(express.json());

// ✅ CORS configuration
const allowedOrigins = [
  "http://www.wecinema.co",
  "https://www.wecinema.co",
  "https://www.wecinema.co/api",
  "http://wecinema.co",
  "http://wecinema.co/api",
  "https://wecinema.co",
  "http://localhost:3000",
  "https://wecinema-main.vercel.app/",
  "https://wecinema-21d00.firebaseapp.com",
  "https://wecinema-co.onrender.com/"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // ✅ Allow credentials/cookies
};

app.use(cors(corsOptions));

// ✅ Default cookie middleware
app.use((req, res, next) => {
  res.cookie("token", "your-token-value", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  next();
});

// Debug logger
app.use((req, res, next) => {
  console.log("Received request: ", req.method, req.url);
  console.log("Request body: ", req.body);
  next();
});

// ✅ Scheduled job: daily at 9 AM
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("Running daily domain/hosting expiration check...");
    await axios.get("https://wecinema.co/api/check-expirations");
    console.log("Expiration check completed");
  } catch (error) {
    console.error("Error in scheduled expiration check:", error);
    Sentry.captureException(error);
  }
});

// ✅ Routes
app.use("/video", VideoController);
app.use("/user", UserController);
app.use("/domain", domainController);
app.use("/sentry", sentryRouter);

// ✅ Marketplace Routes - Fixed the variable name
app.use("/marketplace/listings", listingRoutes);        // 🆕 API prefix add karein
app.use("/marketplace/orders", orderRoutes);           // 🆕 API prefix add karein  
app.use("/marketplace/offers", offerRoutes);           // 🆕 API prefix add karein
app.use("/marketplace/chat", chatRoutes);             // ✅ FIXED: Changed messageRoutes to chatRoutes
app.use("/marketplace/payments", paymentRoutes);      
app.use("/marketplace/stripe", stripeRoutes);         // 🆕 API prefix add karein

// 🆕 STRIPE WEBHOOK ROUTE (Raw body parser ke baath)
app.use("/webhook/stripe", paymentRoutes); // 🆕 Stripe webhook ke liye alag route

// ✅ Error handler (Sentry first, then fallback)
app.use(Sentry.Handlers.errorHandler());
app.use((err, req, res, next) => {
  console.error("Custom Error Handler:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ MongoDB connection
connectDB(
  "mongodb+srv://hamzamanzoor046:oYisNcp2tHTWlQue@wecinema.15sml.mongodb.net/database_name?retryWrites=true&w=majority"
);
console.log("connected db");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🏪 Marketplace API: http://localhost:${PORT}/api/marketplace`); // 🆕 Marketplace info
});