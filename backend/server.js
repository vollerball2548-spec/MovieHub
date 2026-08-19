import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ Routes และการเชื่อมต่อ
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import movieRoutes from "./routes/movies.js";
import bookingRoutes from "./routes/bookings.js";

dotenv.config();

// ✅ เชื่อมต่อ MongoDB
connectDB();

const app = express();

// ✅ Middleware พื้นฐาน
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
        .split(",")
        .map((value) => value.trim());

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin ไม่ได้รับอนุญาต"));
    },
    credentials: true,
  })
);

app.use(express.json()); // ให้ Express อ่าน JSON จาก body ได้

// ✅ Routes หลักของระบบ
app.use("/api/auth", authRoutes);        // สมัคร / ล็อกอิน
app.use("/api/movies", movieRoutes);     // ข้อมูลหนังจาก TMDB
app.use("/api/bookings", bookingRoutes); // จองตั๋ว / ดูประวัติ

// ✅ Route ตรวจสอบสถานะ API
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "MovieHub API" });
});

// ✅ ตรวจสอบสถานะการเชื่อม MongoDB
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully!");
});
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected. API ยังเปิดอยู่ แต่ฟังก์ชันที่ใช้ฐานข้อมูลจะรอการเชื่อมต่อ");
});

// ✅ Error handler กลาง (จับทุก Error ที่ Express เจอ)
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
});

// ✅ เริ่มรันเซิร์ฟเวอร์
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🎬 Server running on port ${PORT}`));
