import { createMovie, getMovie, listMovies } from "./catalog.service.js";

const legacyMovie = (movie) => ({
  _id: movie.id,
  title: movie.title,
  genre: movie.genre,
  year: movie.releaseYear,
  description: movie.description,
  poster: movie.posterUrl,
  duration: movie.durationMinutes,
  availableForPurchase: movie.videoAsset?.status === "PUBLISHED" && movie.videoAsset.rightsConfirmed === true,
  showtimes: Array.from(new Map(movie.showtimes.map((item) => [item.screen.cinema.id, item.screen.cinema])).values()).map((cinema) => ({
    cinema: cinema.name,
    times: movie.showtimes.filter((item) => item.screen.cinema.id === cinema.id).map((item) => item.startsAt.toISOString()),
  })),
});
const publicMovie = (movie) => {
  const { videoAsset, ...fields } = movie;
  return { ...fields, availableForPurchase: videoAsset?.status === "PUBLISHED" && videoAsset.rightsConfirmed === true };
};

export async function getMovies(req, res) {
  const result = await listMovies(req.pagination);
  result.meta.requestId = req.id;
  if (req.baseUrl.startsWith("/api/v1/")) return res.json({ ...result, data: result.data.map(publicMovie) });
  res.json(result.data.map(legacyMovie));
}

export async function getMovieById(req, res) {
  const movie = await getMovie(req.params.movieId);
  res.json(req.baseUrl.startsWith("/api/v1/") ? publicMovie(movie) : legacyMovie(movie));
}

export async function postMovie(req, res) {
  const movie = await createMovie(req.body);
  res.status(201).json(movie);
}
