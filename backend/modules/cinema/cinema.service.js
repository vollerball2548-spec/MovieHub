import { cinemaRepository } from "./cinema.repository.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");

export async function listCinemas(movieId) {
  if (movieId && !isUuid(movieId)) throw new AppError(400, "INVALID_MOVIE_ID", "movieId must be a UUID");
  return cinemaRepository.list({ movieId });
}

export async function getCinema(id) {
  if (!isUuid(id)) throw new AppError(400, "INVALID_CINEMA_ID", "Cinema ID must be a UUID");
  const cinema = await cinemaRepository.findById(id);
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema was not found");
  return cinema;
}

export async function createCinema({ name, address }) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160) throw new AppError(400, "VALIDATION_ERROR", "Cinema name is required (max 160 characters)");
  try {
    return await cinemaRepository.create({ name: name.trim(), normalizedName: name.trim().toLowerCase(), address: address?.trim() || null });
  } catch (error) {
    if (error.code === "P2002") throw new AppError(409, "CINEMA_EXISTS", "A cinema with this name already exists");
    throw error;
  }
}

export async function createScreen(cinemaId, { name, format, rowCount, seatsPerRow }) {
  if (!isUuid(cinemaId)) throw new AppError(400, "INVALID_CINEMA_ID", "Cinema ID must be a UUID");
  if (typeof name !== "string" || !name.trim() || name.length > 80) throw new AppError(400, "VALIDATION_ERROR", "Screen name is required (max 80 characters)");
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 30 || !Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 30) {
    throw new AppError(400, "VALIDATION_ERROR", "Screen layout must have 1–30 rows and 1–30 seats per row");
  }
  const prisma = getPrismaClient();
  const cinema = await prisma.cinema.findUnique({ where: { id: cinemaId }, select: { id: true } });
  if (!cinema) throw new AppError(404, "CINEMA_NOT_FOUND", "Cinema was not found");
  const rows = Array.from({ length: rowCount }, (_, i) => String.fromCharCode(65 + i));
  const seats = rows.flatMap((rowLabel) => Array.from({ length: seatsPerRow }, (_, i) => ({ rowLabel, seatNumber: i + 1 })));
  return cinemaRepository.createScreen({ cinemaId, name: name.trim(), format: format?.trim() || null, seats: { create: seats } });
}
