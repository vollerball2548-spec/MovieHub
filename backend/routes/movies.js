import express from "express";
import Movie from "../models/Movie.js";

const router = express.Router();

// ดึงหนังทั้งหมด
router.get("/", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// เพิ่มหนัง (ใช้ตอน populate data)
router.post("/", async (req, res) => {
  const movie = new Movie(req.body);
  await movie.save();
  res.json(movie);
});

export default router;
