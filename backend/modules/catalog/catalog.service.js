import { catalogRepository } from "./catalog.repository.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function listMovies(pagination) {
  const [data, total] = await Promise.all([catalogRepository.list(pagination), catalogRepository.count()]);
  return { data, meta: { page: pagination.page, pageSize: pagination.pageSize, total, totalPages: Math.ceil(total / pagination.pageSize) } };
}

export async function getMovie(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(400, "INVALID_MOVIE_ID", "Movie ID must be a UUID");
  }
  const movie = await catalogRepository.findById(id);
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie was not found");
  return movie;
}

export async function createMovie(input) {
  if (!input.title?.trim() || input.title.length > 200) throw new AppError(400, "VALIDATION_ERROR", "A title up to 200 characters is required");
  if (input.year !== undefined && (!Number.isInteger(input.year) || input.year < 1888 || input.year > 2200)) throw new AppError(400, "VALIDATION_ERROR", "Year must be a valid integer");
  if (input.duration !== undefined && (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > 1000)) throw new AppError(400, "VALIDATION_ERROR", "Duration must be a positive integer");
  return catalogRepository.create({
    title: input.title.trim(), genre: input.genre, releaseYear: input.year,
    durationMinutes: input.duration, description: input.description, posterUrl: input.poster,
  });
}
