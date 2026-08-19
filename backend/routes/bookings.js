import express from "express";
import Booking from "../models/Booking.js";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * ✅ Middleware ตรวจสอบ JWT Token
 * ใช้ตรวจว่าผู้ใช้ล็อกอินอยู่จริง ก่อนจองหรือดูประวัติ
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "ไม่พบ Token" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token ไม่ถูกต้อง" });
    req.userId = decoded.id;
    next();
  });
}

/**
 * ✅ POST /api/bookings
 * บันทึกการจองใหม่ + สร้าง QR Code อัตโนมัติ
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { movieTitle, seats, time, totalPrice, date, cinema } = req.body;

    // ตรวจสอบข้อมูลก่อนบันทึก
    if (!movieTitle || !seats || !time || !totalPrice) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
    }

    // ✅ สร้าง QR Code สำหรับตั๋ว
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${movieTitle}-${seats}-${new Date().toISOString()}`
    )}`;

    // ✅ บันทึกข้อมูลลง MongoDB
    const booking = new Booking({
      movieTitle,
      seats,
      time,
      date,
      cinema,
      totalPrice,
      qrCode,
      userId: req.userId,
    });

    await booking.save();

    res.json({
      message: "✅ จองสำเร็จ",
      booking,
    });
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
    res.status(500).json({ error: "ไม่สามารถบันทึกการจองได้" });
  }
});

/**
 * ✅ GET /api/bookings
 * ดึงประวัติการจองของผู้ใช้ปัจจุบัน
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("❌ โหลดประวัติไม่สำเร็จ:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดประวัติการจองได้" });
  }
});

/**
 * ✅ GET /api/bookings/all
 * สำหรับ admin – ดูประวัติการจองของทุกคน
 */
router.get("/all", async (req, res) => {
  try {
    const bookings = await Booking.find().populate("userId", "username email");
    res.json(bookings);
  } catch (error) {
    console.error("❌ โหลดข้อมูลทั้งหมดไม่สำเร็จ:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดข้อมูลทั้งหมดได้" });
  }
});

export default router;
