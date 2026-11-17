import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export const catalogRepository = {
  list({ skip, pageSize }) {
    return getPrismaClient().movie.findMany({
      orderBy: { title: "asc" }, skip, take: pageSize,
      include: { showtimes: { where: { startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, include: { screen: { include: { cinema: true } } } }, videoAsset: { select: { status: true, rightsConfirmed: true } } },
    });
  },
  count() {
    return getPrismaClient().movie.count();
  },
  findById(id) {
    return getPrismaClient().movie.findUnique({ where: { id }, include: { showtimes: { where: { startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, include: { screen: { include: { cinema: true } } } }, videoAsset: { select: { status: true, rightsConfirmed: true } } } });
  },
  create(data) {
    return getPrismaClient().movie.create({ data });
  },
};
