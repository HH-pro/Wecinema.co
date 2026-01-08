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
  chatRoutes,
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

// ================== Sentry Setup ==================
Sentry.init({
  dsn: "https://ffba1b70eb56e50557f3a75a5899e7ab@o4509361947148288.ingest.us.sentry.io/4509361953177600",
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ================== Security Headers ==================
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// ================== Logging ==================
app.use(morgan("dev"));

// ================== Stripe Webhook (Raw Body Parser) ==================
app.use("/webhook/stripe", express.raw({ type: "application/json" }));

// ================== JSON Parser ==================
app.use(express.json());

// ================== CORS Setup ==================
const allowedOrigins = [
  "http://localhost:3000",
  "https://wecinema-co.vercel.app",
  "https://wecinema-21d00.firebaseapp.com",
  "https://wecinema.co",
  "http://wecinema.co",
  "http://www.wecinema.co",
  "https://www.wecinema.co",
  "https://wecinema-co.onrender.com",
  
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("Blocked by CORS: ", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// ================== Cookie Middleware ==================
app.use((req, res, next) => {
  res.cookie("token", "your-token-value", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  next();
});

// ================== Debug Logger ==================
app.use((req, res, next) => {
  console.log("Received request: ", req.method, req.url);
  console.log("Request body: ", req.body);
  next();
});

// ================== Cron Job: Daily Expiration Check ==================
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

// ================== Routes ==================
app.use("/video", VideoController);
app.use("/user", UserController);
app.use("/domain", domainController);
app.use("/sentry", sentryRouter);

// Marketplace Routes
app.use("/marketplace/listings", listingRoutes);
app.use("/marketplace/orders", orderRoutes);
app.use("/marketplace/offers", offerRoutes);
app.use("/marketplace/chat", chatRoutes);
app.use("/marketplace/payments", paymentRoutes);
app.use("/marketplace/stripe", stripeRoutes);

// Stripe Webhook route again (raw parser)
app.use("/webhook/stripe", paymentRoutes);

// ================== Error Handling ==================
app.use(Sentry.Handlers.errorHandler());
app.use((err, req, res, next) => {
  console.error("Custom Error Handler:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ================== MongoDB Connection ==================
connectDB(
  "mongodb+srv://hamzamanzoor046:oYisNcp2tHTWlQue@wecinema.15sml.mongodb.net/database_name?retryWrites=true&w=majority"
);
console.log("Connected to MongoDB");

// ================== Start Server ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🏪 Marketplace API: http://localhost:${PORT}/api/marketplace`);
});
