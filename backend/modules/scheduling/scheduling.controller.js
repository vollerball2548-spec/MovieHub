import { createShowtime, getSeatAvailability, listShowtimes } from "./scheduling.service.js";

export async function getShowtimes(req, res) {
  res.json(await listShowtimes({ movieId: req.query.movieId, cinemaId: req.query.cinemaId, date: req.query.date }));
}

export async function getSeats(req, res) {
  res.json(await getSeatAvailability(req.params.showtimeId));
}

export async function postShowtime(req, res) {
  res.status(201).json(await createShowtime(req.body));
}
