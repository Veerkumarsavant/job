const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });
const cookieParser = require("cookie-parser");
const http = require("http");
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { Server } = require("socket.io");
const notificationSocket = require("./sockets/notificationSocket");
require("./config/passport");
const rateLimiter = require("./middleware/rateLimiter");
const errorHandler = require("./utils/errorHandler");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const jobRoutes = require("./routes/jobRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const searchRoutes = require("./routes/searchRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const recruiterRoutes = require("./routes/recruiterRoutes");
const messageRoutes = require("./routes/messageRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const app = express();
app.set("trust proxy", 1);

// Render persistent disk: mount at /var/data and set UPLOAD_DIR=/var/data/uploads.
// Local development defaults to backend/uploads.
const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, "uploads")
);
fs.mkdirSync(uploadRoot, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://job-portal-system-y666.onrender.com"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(
        process.env.FRONTEND_URL.replace(/\/$/, "")
    );
}

if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(
        process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "")
    );
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Parse cookies before authentication routes
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(morgan("dev"));
app.use("/api/auth/register", rateLimiter.loginLimiter);
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(uploadRoot));
app.use("/resumes", express.static(path.join(uploadRoot, "resumes")));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ProConnect API" });
});

app.use(errorHandler);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

notificationSocket(io);
app.set("io", io);


function debugMongoUri(uri) {
  console.log(".env file present on server:", fs.existsSync(envPath));

  if (!uri) {
    console.error("MONGO_URI is NOT set at all (check the variable name in Render)");
    return;
  }

  try {
    const u = new URL(uri);
   // console.log("DB host:", u.host);
  //  console.log("DB user:", decodeURIComponent(u.username));
   // console.log("DB path:", u.pathname);
  //  console.log("Password length:", decodeURIComponent(u.password).length);
  //  console.log("URI has whitespace:", /\s/.test(uri));

    if (fs.existsSync(envPath)) {
      const fromFile = require("dotenv").parse(fs.readFileSync(envPath)).MONGO_URI;
      console.log("Value matches the .env file:", fromFile === uri);
    }
  } catch (e) {
    console.error("MONGO_URI is malformed:", e.message);
  }
}


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : "";

debugMongoUri(MONGO_URI);

if (!MONGO_URI) {
  console.error("Missing MONGO_URI environment variable. Exiting.");
  process.exit(1);
}

mongoose.connect(MONGO_URI).then(() => {
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });