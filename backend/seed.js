import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "./generated/prisma/index.js";

dotenv.config({ path: [".env.local", ".env"] });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const movies = [
    { title: "Interstellar", genre: "Sci-Fi", releaseYear: 2014, durationMinutes: 169, description: "A team travels beyond this galaxy to discover whether mankind has a future among the stars.", posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
    { title: "Inception", genre: "Sci-Fi", releaseYear: 2010, durationMinutes: 148, description: "A skilled thief is offered a chance to have his criminal record erased if he can plant an idea in a target's mind.", posterUrl: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
    { title: "Dune: Part Two", genre: "Sci-Fi", releaseYear: 2024, durationMinutes: 166, description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.", posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
    { title: "The Dark Knight", genre: "Action", releaseYear: 2008, durationMinutes: 152, description: "Batman faces the Joker, a criminal mastermind intent on plunging Gotham City into anarchy.", posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
    { title: "Spider-Man: Across the Spider-Verse", genre: "Animation", releaseYear: 2023, durationMinutes: 140, description: "Miles Morales is pulled into a multiverse of Spider-People and a new mission across realities.", posterUrl: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
    { title: "Oppenheimer", genre: "Drama", releaseYear: 2023, durationMinutes: 180, description: "The story of J. Robert Oppenheimer and the creation of the atomic bomb.", posterUrl: "https://image.tmdb.org/t/p/w500/mgjKNDzFINGvNFtHSqzfUZ4pk6Y.jpg" },
    { title: "Barbie", genre: "Comedy", releaseYear: 2023, durationMinutes: 114, description: "Barbie and Ken leave their perfect world and discover the joys and challenges of the real world.", posterUrl: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg" },
    { title: "Avengers: Endgame", genre: "Action", releaseYear: 2019, durationMinutes: 181, description: "The surviving Avengers assemble once more to reverse the damage caused by Thanos.", posterUrl: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
    { title: "Joker", genre: "Crime", releaseYear: 2019, durationMinutes: 122, description: "A struggling comedian's life in Gotham City spirals into a story of identity and violence.", posterUrl: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
    { title: "Parasite", genre: "Thriller", releaseYear: 2019, durationMinutes: 132, description: "A poor family gradually enters the lives of a wealthy household, with unexpected consequences.", posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
    { title: "Coco", genre: "Animation", releaseYear: 2017, durationMinutes: 105, description: "A young musician journeys to the Land of the Dead to uncover his family's history.", posterUrl: "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg" },
    { title: "Spirited Away", genre: "Animation", releaseYear: 2001, durationMinutes: 125, description: "A girl enters a world ruled by spirits and must find a way to return home.", posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
    { title: "The Shawshank Redemption", genre: "Drama", releaseYear: 1994, durationMinutes: 142, description: "Two imprisoned men form a lasting friendship and find hope over the years.", posterUrl: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg" },
    { title: "The Godfather", genre: "Crime", releaseYear: 1972, durationMinutes: 175, description: "The aging head of a crime family transfers control to his reluctant youngest son.", posterUrl: "https://image.tmdb.org/t/p/w500/3bh3eTf7ZFLBb2OdpJZB7BZNf4q.jpg" },
    { title: "The Lord of the Rings: The Fellowship of the Ring", genre: "Fantasy", releaseYear: 2001, durationMinutes: 178, description: "A hobbit and his companions begin a journey to destroy a powerful ring.", posterUrl: "https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg" },
  ];
  const existingMovies = await prisma.movie.findMany({ orderBy: { id: "asc" } });
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const existing = existingMovies[i] || await prisma.movie.findFirst({ where: { title: movie.title } });
    if (existing) await prisma.movie.update({ where: { id: existing.id }, data: movie });
    else await prisma.movie.create({ data: movie });
  }

  const cinemaDefs = [
    { name: "MovieHub Central", address: "Bangkok", normalizedName: "moviehub central" },
    { name: "MovieHub Riverside", address: "Bangkok", normalizedName: "moviehub riverside" },
  ];
  const movieRows = await prisma.movie.findMany({ orderBy: { title: "asc" } });
  const showtimes = [];
  let slotIndex = 0;
  for (const def of cinemaDefs) {
    const cinema = await prisma.cinema.upsert({ where: { normalizedName: def.normalizedName }, update: { address: def.address }, create: def });
    for (const screenName of ["Screen 1", "Screen 2"]) {
      const screen = await prisma.screen.upsert({ where: { cinemaId_name: { cinemaId: cinema.id, name: screenName } }, update: {}, create: { cinemaId: cinema.id, name: screenName, format: "2D" } });
      const seats = ["A", "B", "C", "D", "E"].flatMap((rowLabel) => Array.from({ length: 8 }, (_, i) => ({ screenId: screen.id, rowLabel, seatNumber: i + 1 })));
      await prisma.seat.createMany({ data: seats, skipDuplicates: true });
      for (let day = 1; day <= 7; day++) {
        for (const hour of [12, 18]) {
          const startsAt = new Date();
          startsAt.setDate(startsAt.getDate() + day);
          startsAt.setHours(hour, 0, 0, 0);
          const movie = movieRows[slotIndex++ % movieRows.length];
          const endsAt = new Date(startsAt.getTime() + (movie.durationMinutes || 120) * 60_000 + 20 * 60_000);
          showtimes.push({ movieId: movie.id, screenId: screen.id, startsAt, endsAt, basePrice: 180, currency: "THB" });
        }
      }
    }
  }
  const showtimeValues = showtimes.map((showtime) => Prisma.sql`(${randomUUID()}::uuid, ${showtime.movieId}::uuid, ${showtime.screenId}::uuid, ${showtime.startsAt}, ${showtime.endsAt}, ${showtime.basePrice}, ${showtime.currency}, now(), now())`);
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "showtimes" ("id", "movie_id", "screen_id", "starts_at", "ends_at", "base_price", "currency", "created_at", "updated_at")
    VALUES ${Prisma.join(showtimeValues)}
    ON CONFLICT ("screen_id", "starts_at") DO UPDATE SET
      "movie_id" = EXCLUDED."movie_id", "ends_at" = EXCLUDED."ends_at", "base_price" = EXCLUDED."base_price", "currency" = EXCLUDED."currency", "updated_at" = now()
    WHERE NOT EXISTS (SELECT 1 FROM "bookings" WHERE "showtime_id" = "showtimes"."id")
      AND NOT EXISTS (SELECT 1 FROM "seat_reservations" WHERE "showtime_id" = "showtimes"."id")
  `);

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const seedRole = async (role, email, password, username) => {
    if (!email && !password) return;
    if (!email || !password || password.length < 8) throw new Error(`${role} seed requires an email and a password of at least 8 characters`);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({ where: { email: email.toLowerCase() }, update: { username, passwordHash, role }, create: { username, email: email.toLowerCase(), passwordHash, role } });
  };
  await seedRole("ADMIN", adminEmail, adminPassword, process.env.SEED_ADMIN_USERNAME || "admin");
  await seedRole("STAFF", process.env.SEED_STAFF_EMAIL, process.env.SEED_STAFF_PASSWORD, process.env.SEED_STAFF_USERNAME || "staff");
  console.log("Seed complete. Catalog, cinemas, screens, seats, and seven days of sample showtimes are ready.");
}

main().finally(() => prisma.$disconnect());
