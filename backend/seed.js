import dotenv from "dotenv";
import mongoose from "mongoose";
import Movie from "./models/Movie.js";

dotenv.config();

const movies = [
  {
    title: "Inception",
    genre: "Sci-Fi",
    year: 2010,
    description: "ทีมขโมยความฝันที่ต้องทำภารกิจซ้อนภารกิจให้สำเร็จ",
    poster: "https://placehold.co/500x750/17202c/f97316?text=Inception",
    duration: 148,
  },
  {
    title: "Avatar",
    genre: "Action",
    year: 2009,
    description: "การผจญภัยบนดาวแพนดอร่าที่เปลี่ยนชะตาของมนุษย์",
    poster: "https://placehold.co/500x750/0f3d4c/67e8f9?text=Avatar",
    duration: 162,
  },
  {
    title: "The Dark Knight",
    genre: "Action",
    year: 2008,
    description: "อัศวินรัตติกาลเผชิญหน้ากับศัตรูที่คาดเดาไม่ได้",
    poster: "https://placehold.co/500x750/1e293b/fde68a?text=The+Dark+Knight",
    duration: 152,
  },
  {
    title: "Interstellar",
    genre: "Sci-Fi",
    year: 2014,
    description: "ภารกิจข้ามจักรวาลเพื่อค้นหาบ้านหลังใหม่ให้มนุษยชาติ",
    poster: "https://placehold.co/500x750/111827/a5b4fc?text=Interstellar",
    duration: 169,
  },
  {
    title: "The Last Horizon",
    genre: "Adventure",
    year: 2026,
    description: "การเดินทางครั้งสุดท้ายที่จะเปลี่ยนทุกอย่าง",
    poster: "https://placehold.co/500x750/17202c/f97316?text=The+Last+Horizon",
    duration: 128,
  },
];

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