import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export const schedulingRepository = {
  list({ movieId, cinemaId, startsAt, endsAt }) {
    return getPrismaClient().showtime.findMany({
      where: { movieId, screen: cinemaId ? { cinemaId } : undefined, startsAt: { gte: startsAt, lt: endsAt } },
      orderBy: { startsAt: "asc" },
      include: { movie: true, screen: { include: { cinema: true } }, _count: { select: { reservations: true } } },
    });
  },
  findWithSeats(id) {
    return getPrismaClient().showtime.findUnique({ where: { id }, include: { movie: true, screen: { include: { cinema: true, seats: { orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }] } } } } });
  },
};
