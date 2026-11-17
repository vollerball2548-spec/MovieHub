import { Router } from "express";
import { getMovieById, getMovies, postMovie } from "./catalog.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { validatePagination, validateRequest } from "../../shared/middleware/validate-request.js";

const router = Router();

const movieSchema = {
  safeParse(value) {
    const errors = {};
    if (typeof value?.title !== "string" || !value.title.trim() || value.title.length > 200) errors.title = ["Title is required (max 200 characters)"];
    if (value?.genre !== undefined && (typeof value.genre !== "string" || value.genre.length > 80)) errors.genre = ["Genre must be a string up to 80 characters"];
    if (value?.year !== undefined && (!Number.isInteger(value.year) || value.year < 1888 || value.year > 2200)) errors.year = ["Year must be a valid integer"];
    if (value?.duration !== undefined && (!Number.isInteger(value.duration) || value.duration < 1 || value.duration > 1000)) errors.duration = ["Duration must be a positive integer"];
    if (value?.description !== undefined && (typeof value.description !== "string" || value.description.length > 5000)) errors.description = ["Description must be a string up to 5000 characters"];
    if (value?.poster !== undefined && (typeof value.poster !== "string" || value.poster.length > 2048)) errors.poster = ["Poster must be a URL up to 2048 characters"];
    if (Object.keys(errors).length) return { success: false, error: { flatten: () => ({ fieldErrors: errors }) } };
    return { success: true, data: { title: value.title.trim(), genre: value.genre, year: value.year, description: value.description, poster: value.poster, duration: value.duration } };
  },
};

router.get("/", validatePagination({ defaultPageSize: 24 }), getMovies);
router.get("/:movieId", getMovieById);
router.post("/", authenticate, requireRole("admin"), validateRequest(movieSchema), postMovie);

export default router;
