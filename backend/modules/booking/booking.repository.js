import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export const bookingRepository = {
  listForUser(userId, { skip, pageSize }) {
    return getPrismaClient().booking.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip, take: pageSize, include: { seats: true, showtime: { include: { movie: true, screen: { include: { cinema: true } } } }, ticket: true } });
  },
  countForUser(userId) { return getPrismaClient().booking.count({ where: { userId } }); },
  listAll({ skip, pageSize }) {
    return getPrismaClient().booking.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize, include: { user: { select: { id: true, username: true, email: true } }, seats: true, showtime: { include: { movie: true, screen: { include: { cinema: true } } } } } });
  },
  countAll() { return getPrismaClient().booking.count(); },
  findByIdForUser(id, userId) {
    return getPrismaClient().booking.findFirst({ where: { id, userId }, include: { seats: true, showtime: { include: { movie: true, screen: { include: { cinema: true } } } }, payments: true, ticket: true } });
  },
};
