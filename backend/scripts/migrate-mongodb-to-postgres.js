import "dotenv/config";
import mongoose from "mongoose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";
import User from "../models/User.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";

const apply = process.argv.includes("--apply");
const mongoUrl = process.env.MONGO_URI;
const postgresUrl = process.env.DATABASE_URL;

if (!mongoUrl) {
  throw new Error("MONGO_URI is required to profile the source database");
}
if (apply && !postgresUrl) {
  throw new Error("DATABASE_URL is required when --apply is requested");
}

const normalize = (value) => String(value || "").trim().toLocaleLowerCase("en");
const legacyId = (document) => String(document._id);
const prisma = apply ? new PrismaClient({ adapter: new PrismaPg({ connectionString: postgresUrl }) }) : undefined;

function profile(users, movies, bookings) {
  const usernames = new Set();
  const emails = new Set();
  const issues = { duplicateUsername: 0, duplicateEmail: 0, invalidUser: 0, invalidMovie: 0, invalidBooking: 0, orphanBooking: 0 };
  const validUsers = [];

  for (const user of users) {
    const username = String(user.username || "").trim();
    const email = normalize(user.email);
    if (!username || username.length > 40 || /[\u0000-\u001f\u007f]/.test(username) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !user.password) {
      issues.invalidUser += 1;
      continue;
    }
    if (usernames.has(normalize(username))) { issues.duplicateUsername += 1; continue; }
    if (emails.has(email)) { issues.duplicateEmail += 1; continue; }
    usernames.add(normalize(username));
    emails.add(email);
    validUsers.push(user);
  }

  const userIds = new Set(validUsers.map(legacyId));
  const validMovies = movies.filter((movie) => {
    const valid = typeof movie.title === "string" && movie.title.trim().length > 0 && movie.title.trim().length <= 200 &&
      (movie.genre == null || (typeof movie.genre === "string" && movie.genre.length <= 80)) &&
      (movie.year == null || (Number.isInteger(movie.year) && movie.year >= 1888 && movie.year <= 2200)) &&
      (movie.duration == null || (Number.isInteger(movie.duration) && movie.duration >= 1 && movie.duration <= 1000)) &&
      (movie.description == null || typeof movie.description === "string") &&
      (movie.poster == null || (typeof movie.poster === "string" && movie.poster.length <= 2048));
    if (!valid) issues.invalidMovie += 1;
    return valid;
  });
  const validBookings = bookings.filter((booking) => {
    const amount = Number(booking.totalPrice);
    const seats = Array.isArray(booking.seats) && booking.seats.every((seat) => typeof seat === "string" && seat.trim() && seat.trim().length <= 16);
    const cinema = booking.cinema == null || (typeof booking.cinema === "string" && booking.cinema.length <= 160);
    const legacyDate = booking.date == null || (typeof booking.date === "string" && booking.date.length <= 80);
    const legacyTime = booking.time == null || (typeof booking.time === "string" && booking.time.length <= 40);
    const valid = typeof booking.movieTitle === "string" && booking.movieTitle.trim() && booking.movieTitle.trim().length <= 200 && Number.isFinite(amount) && amount >= 0 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001 && seats && cinema && legacyDate && legacyTime;
    if (!valid) { issues.invalidBooking += 1; return false; }
    if (!userIds.has(String(booking.userId))) { issues.orphanBooking += 1; return false; }
    return true;
  });

  const cinemaNames = new Map();
  for (const movie of validMovies) {
    for (const showtime of movie.showtimes || []) {
      const name = String(showtime.cinema || "").trim();
      if (name && name.length <= 160) cinemaNames.set(normalize(name), name);
    }
  }
  for (const booking of validBookings) {
    const name = String(booking.cinema || "").trim();
    if (name && name.length <= 160) cinemaNames.set(normalize(name), name);
  }

  return { issues, validUsers, validMovies, validBookings, cinemaNames };
}

async function recordLegacyMap(collection, id, targetEntity, targetId) {
  await prisma.legacyIdMap.upsert({
    where: { source_collection_legacyId: { source: "mongodb", collection, legacyId: id } },
    create: { source: "mongodb", collection, legacyId: id, targetEntity, targetId },
    update: { targetEntity, targetId },
  });
}

try {
  await mongoose.connect(mongoUrl);
  const [users, movies, bookings] = await Promise.all([
    User.find().select("+password").lean(),
    Movie.find().lean(),
    Booking.find().lean(),
  ]);
  const data = profile(users, movies, bookings);

  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    sourceCounts: { users: users.length, movies: movies.length, bookings: bookings.length },
    importableCounts: { users: data.validUsers.length, movies: data.validMovies.length, cinemas: data.cinemaNames.size, bookings: data.validBookings.length },
    quarantined: data.issues,
    notes: ["Legacy showtimes have no dates/screens and are not imported as live showtimes", "No payment or QR records are imported as verified", "Refresh sessions must be reissued after cutover"],
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. Pass --apply after reviewing the report and backing up both databases.");
  } else {
    await prisma.$connect();
    const userIds = new Map();
    const movieTitles = new Map();
    const cinemaIds = new Map();

    for (const user of data.validUsers) {
      const id = legacyId(user);
      const migrated = await prisma.user.upsert({
        where: { legacyId: id },
        create: { legacyId: id, username: user.username.trim(), email: normalize(user.email), passwordHash: user.password, role: "USER" },
        update: {},
      });
      userIds.set(id, migrated.id);
      await recordLegacyMap("users", id, "users", migrated.id);
    }

    for (const movie of data.validMovies) {
      const id = legacyId(movie);
      const title = movie.title.trim();
      const migrated = await prisma.movie.upsert({
        where: { legacyId: id },
        create: {
          legacyId: id, title, genre: movie.genre || null, releaseYear: Number.isInteger(movie.year) ? movie.year : null,
          description: movie.description || null, posterUrl: movie.poster || null,
          durationMinutes: Number.isInteger(movie.duration) ? movie.duration : null,
        },
        update: {},
      });
      const titleKey = normalize(title);
      movieTitles.set(titleKey, movieTitles.has(titleKey) ? null : migrated.id);
      await recordLegacyMap("movies", id, "movies", migrated.id);
    }

    for (const [key, name] of data.cinemaNames) {
      const migrated = await prisma.cinema.upsert({
        where: { normalizedName: key },
        create: { name, normalizedName: key, timezone: "Asia/Bangkok" },
        update: {},
      });
      cinemaIds.set(key, migrated.id);
    }

    for (const booking of data.validBookings) {
      const id = legacyId(booking);
      const userId = userIds.get(String(booking.userId));
      const movieId = movieTitles.get(normalize(booking.movieTitle)) || null;
      const cinemaName = String(booking.cinema || "").trim();
      const cinemaId = cinemaIds.get(normalize(cinemaName)) || null;
      const amount = Number(booking.totalPrice).toFixed(2);
      const migrated = await prisma.booking.upsert({
        where: { legacyId: id },
        create: {
          legacyId: id, userId, movieId, cinemaId, status: "LEGACY_UNVERIFIED",
          movieTitleSnapshot: booking.movieTitle.trim(), cinemaNameSnapshot: cinemaName || null,
          legacyDateSnapshot: booking.date ? String(booking.date).slice(0, 80) : null,
          legacyTimeSnapshot: booking.time ? String(booking.time).slice(0, 40) : null,
          totalAmount: amount, currency: "THB",
          seats: { create: booking.seats.map((label) => ({ seatLabelSnapshot: label.trim(), unitPrice: null })) },
        },
        update: {},
      });
      await recordLegacyMap("bookings", id, "bookings", migrated.id);
    }
    console.log("Migration import finished. Verify counts, foreign keys, totals, and sample history before cutover.");
  }
} finally {
  await Promise.allSettled([mongoose.disconnect(), prisma?.$disconnect()]);
}
