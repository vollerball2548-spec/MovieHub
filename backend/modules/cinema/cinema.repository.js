import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export const cinemaRepository = {
  list({ movieId }) {
    return getPrismaClient().cinema.findMany({
      where: movieId ? { screens: { some: { showtimes: { some: { movieId, startsAt: { gt: new Date() } } } } } } : undefined,
      orderBy: { name: "asc" },
      include: { screens: { include: { _count: { select: { seats: true } } } } },
    });
  },
  findById(id) {
    return getPrismaClient().cinema.findUnique({ where: { id }, include: { screens: { include: { seats: { orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }] } } } } });
  },
  create(data) { return getPrismaClient().cinema.create({ data }); },
  createScreen(data) { return getPrismaClient().screen.create({ data, include: { seats: true } }); },
};
