import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { authRepository } from "./auth.repository.js";
import { config } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";

export async function registerUser({ username, email, password }) {
  if (typeof username !== "string" || typeof email !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Username and email are required");
  }
  const normalizedUsername = username.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedUsername || normalizedUsername.length > 40 || /[\u0000-\u001f\u007f]/.test(normalizedUsername) || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError(400, "VALIDATION_ERROR", "Enter a valid username and email address");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new AppError(400, "VALIDATION_ERROR", "Password must contain 8–128 characters");
  }
  const existing = await authRepository.findByIdentity(normalizedUsername, normalizedEmail);
  if (existing) throw new AppError(409, "IDENTITY_TAKEN", "Username or email is already in use");
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await authRepository.create({ username: normalizedUsername, email: normalizedEmail, passwordHash });
  } catch (error) {
    if (error.code === "P2002") throw new AppError(409, "IDENTITY_TAKEN", "Username or email is already in use");
    throw error;
  }
  return { message: "Registration successful" };
}

export async function loginUser({ username, password }) {
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    throw new AppError(400, "VALIDATION_ERROR", "Username and password are required");
  }
  const user = await authRepository.findByUsername(username.trim());
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!matches) throw new AppError(401, "INVALID_CREDENTIALS", "Username or password is incorrect");
  return { accessToken: createAccessToken(user), refreshToken: await createRefreshSession(user), username: user.username, email: user.email };
}

function createAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: String(user.role || "USER").toLowerCase(), type: "access" },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, algorithm: "HS256", issuer: config.jwtIssuer, audience: config.jwtAudience }
  );
}

async function createRefreshSession(user) {
  const token = randomBytes(48).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlMs);
  await getPrismaClient().refreshSession.create({ data: { tokenHash, userId: user.id, expiresAt } });
  return token;
}

export async function rotateRefreshSession(token) {
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Refresh session is missing or expired");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const session = await tx.refreshSession.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } });
    if (!session) throw new AppError(401, "UNAUTHENTICATED", "Refresh session is missing or expired");
    const removed = await tx.refreshSession.deleteMany({ where: { id: session.id, tokenHash } });
    if (!removed.count) throw new AppError(401, "UNAUTHENTICATED", "Refresh session was already rotated");
    const user = await tx.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new AppError(401, "UNAUTHENTICATED", "User session is no longer valid");
    const nextToken = randomBytes(48).toString("base64url");
    const nextHash = createHash("sha256").update(nextToken).digest("hex");
    const nextExpiry = new Date(Date.now() + config.refreshTokenTtlMs);
    await tx.refreshSession.create({ data: { tokenHash: nextHash, userId: user.id, expiresAt: nextExpiry } });
    return { accessToken: createAccessToken(user), refreshToken: nextToken };
  });
}

export async function revokeRefreshSession(token) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await getPrismaClient().refreshSession.deleteMany({ where: { tokenHash } });
}
