import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export const authRepository = {
  findByUsername(username) {
    return getPrismaClient().user.findUnique({ where: { username } });
  },
  findByIdentity(username, email) {
    return getPrismaClient().user.findFirst({ where: { OR: [{ username }, { email }] } });
  },
  findById(id) {
    return getPrismaClient().user.findUnique({ where: { id } });
  },
  create(user) {
    return getPrismaClient().user.create({ data: user });
  },
};
