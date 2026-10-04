require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const swaggerSpec = require("./config/swagger");
const { setupTestSocket } = require("./socket/testSocket");
const { startTestReminderJob } = require("./jobs/testReminder.job");

// ─── Initialize App ───
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Socket.IO (same port as API) ───
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io",
});
setupTestSocket(io);

// ─── Connect Database ───
connectDB();

// ─── Background jobs ───
startTestReminderJob();

// ─── Trust proxy (for correct client IP when behind Nginx etc.) ───
app.set("trust proxy", 1);

// ─── Middlewares ───
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// ─── Static Files (uploads) ───
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Swagger Docs ───
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Sparks API Docs",
}));

// ─── Health Check Route ───
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Sparks Backend API is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy ✅",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/admin/auth", require("./routes/adminAuth.routes"));
app.use("/api/admin/dashboard", require("./routes/dashboard.routes"));
app.use("/api/students", require("./routes/studentAuth.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/courses", require("./routes/course.routes"));
app.use("/api/videos", require("./routes/video.routes"));
app.use("/api/reels", require("./routes/reel.routes"));
app.use("/api/playlists", require("./routes/playlist.routes"));
app.use("/api/tests", require("./routes/test.routes"));

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start Server ───
server.listen(PORT,"0.0.0.0", () => {
  console.log(`\n🚀 Sparks Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO: ws on same port`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs\n`);
});

