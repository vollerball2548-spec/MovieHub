import { createCinema, createScreen, getCinema, listCinemas } from "./cinema.service.js";

export async function getCinemas(req, res) {
  res.json(await listCinemas(req.query.movieId));
}

export async function getCinemaById(req, res) {
  res.json(await getCinema(req.params.cinemaId));
}

export async function postCinema(req, res) {
  res.status(201).json(await createCinema(req.body));
}

export async function postScreen(req, res) {
  res.status(201).json(await createScreen(req.params.cinemaId, req.body));
}
