import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/**
 * 🧩 สมัครสมาชิก
 */
router.post("/register", async (req, res) => {
  try {
    const usernameValue = req.body.username?.trim();
    const emailValue = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!usernameValue || !emailValue || !password || password.length < 6) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ และรหัสผ่านอย่างน้อย 6 ตัวอักษร" });
    }

    const exist = await User.findOne({
      $or: [{ username: usernameValue }, { email: emailValue }],
    });
    if (exist) {
      const message = exist.username === usernameValue ? "ชื่อผู้ใช้นี้ถูกใช้แล้ว" : "อีเมลนี้ถูกใช้แล้ว";
      return res.status(400).json({ error: message });
    }

    // เข้ารหัสรหัสผ่าน
    const hashed = await bcrypt.hash(password, 10);

    // บันทึกลงฐานข้อมูล
    const newUser = new User({ username: usernameValue, email: emailValue, password: hashed });
    await newUser.save();

    res.json({ message: "สมัครสมาชิกสำเร็จ!" });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว" });
    }
    res.status(500).json({ error: "ไม่สามารถสมัครสมาชิกได้" });
  }
});

/**
 * 🔐 เข้าสู่ระบบ
 */
router.post("/login", async (req, res) => {
  try {
    const usernameValue = req.body.username?.trim();
    const { password } = req.body;

    if (!usernameValue || !password) {
      return res.status(400).json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    // ตรวจสอบว่ามีผู้ใช้นี้ไหม
    const user = await User.findOne({ username: usernameValue });
    if (!user) {
      return res.status(400).json({ error: "ไม่พบผู้ใช้" });
    }

    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      username: user.username,
      message: "เข้าสู่ระบบสำเร็จ!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

export default router;
