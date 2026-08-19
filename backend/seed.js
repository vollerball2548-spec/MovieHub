import dotenv from "dotenv";
import mongoose from "mongoose";
import Movie from "./models/Movie.js";

dotenv.config();

const majorShowtimes = [
  { cinema: "Major Cineplex รัชโยธิน", times: ["11:00", "13:45", "16:30", "19:15", "21:45"] },
  { cinema: "Major Cineplex ปิ่นเกล้า", times: ["10:30", "13:15", "16:00", "18:45", "21:30"] },
  { cinema: "Major Cineplex เมกาบางนา", times: ["11:30", "14:15", "17:00", "19:45", "22:15"] },
  { cinema: "Major Cineplex พระราม 3", times: ["12:00", "14:45", "17:30", "20:15"] },
];

const movies = [
  ["Inception", "Sci-Fi", 2010, "ทีมขโมยความฝันที่ต้องทำภารกิจซ้อนภารกิจให้สำเร็จ", 148],
  ["Avatar", "Action", 2009, "การผจญภัยบนดาวแพนดอร่าที่เปลี่ยนชะตาของมนุษย์", 162],
  ["The Dark Knight", "Action", 2008, "อัศวินรัตติกาลเผชิญหน้ากับศัตรูที่คาดเดาไม่ได้", 152],
  ["Interstellar", "Sci-Fi", 2014, "ภารกิจข้ามจักรวาลเพื่อค้นหาบ้านหลังใหม่ให้มนุษยชาติ", 169],
  ["The Last Horizon", "Adventure", 2026, "การเดินทางครั้งสุดท้ายที่จะเปลี่ยนทุกอย่าง", 128],
  ["Midnight Signal", "Thriller", 2026, "สัญญาณลึกลับในคืนที่ไม่มีใครหลับ", 114],
  ["Ocean Between Us", "Drama", 2026, "เรื่องราวของคนสองคนที่กลับมาพบกัน", 121],
  ["Neon Runner", "Action", 2026, "ภารกิจไล่ล่าท่ามกลางเมืองที่ไม่เคยหลับ", 106],
  ["The Quiet Room", "Mystery", 2026, "ความลับที่ซ่อนอยู่ในห้องปิดตาย", 98],
  ["Mission: Impossible", "Action", 2025, "สายลับที่ต้องหยุดภารกิจอันตรายก่อนเวลาจะหมด", 134],
  ["How to Train Your Dragon", "Animation", 2025, "มิตรภาพระหว่างเด็กหนุ่มกับมังกรผู้ไม่เหมือนใคร", 125],
  ["Jurassic World", "Adventure", 2025, "การกลับมาของโลกไดโนเสาร์ที่ยิ่งใหญ่กว่าเดิม", 130],
].map(([title, genre, year, description, duration]) => ({
  title,
  genre,
  year,
  description,
  duration,
  poster: `https://placehold.co/500x750/17202c/f97316?text=${encodeURIComponent(title)}`,
  showtimes: majorShowtimes,
}));

try {
  await mongoose.connect(process.env.MONGO_URI);
  await Movie.deleteMany({});
  await Movie.insertMany(movies);
  console.log(`Seed data added successfully: ${movies.length} movies`);
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}