import { Router } from "express";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import jwt from "jsonwebtoken";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { AppError } from "../../shared/errors/app-error.js";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { getMoviePlayback } from "./purchase.service.js";
import { config } from "../../config/env.js";
import { rateLimit } from "../../shared/middleware/rate-limit.js";

const router = Router();
const storageRoot = resolve(process.env.MEDIA_STORAGE_DIR || fileURLToPath(new URL("../../storage/videos", import.meta.url)));
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const uploadLimiter = rateLimit({ windowMs: 60 * 60_000, max: 3 });
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
router.get("/:movieId/stream", async (req, res) => {
  let claims;
  try { claims = jwt.verify(String(req.query.token || ""), config.jwtSecret, { algorithms: ["HS256"], issuer: config.jwtIssuer, audience: config.jwtAudience }); }
  catch { throw new AppError(401, "PLAYBACK_LINK_EXPIRED", "Playback link is invalid or expired"); }
  if (!["movie_playback", "movie_review"].includes(claims.purpose) || claims.movieId !== req.params.movieId) throw new AppError(401, "PLAYBACK_LINK_INVALID", "Playback link is not valid for this title");
  let asset;
  if (claims.purpose === "movie_playback") asset = (await getMoviePlayback(claims.userId, req.params.movieId, claims.role === "admin")).asset;
  else {
    if (claims.role !== "admin") throw new AppError(403, "FORBIDDEN", "Admin access is required to preview submitted video");
    asset = await getPrismaClient().movieVideoAsset.findFirst({ where: { movieId: req.params.movieId, status: "PENDING_REVIEW", rightsConfirmed: true }, select: { storageKey: true } });
    if (!asset) throw new AppError(404, "VIDEO_NOT_PENDING", "No submitted video is awaiting review");
  }
  return streamFile(req, res, asset.storageKey);
});

router.use(authenticate);

router.put("/admin/:movieId/video", requireRole("admin"), uploadLimiter, async (req, res) => {
  const { movieId } = req.params;
  if (!uuid(movieId)) throw new AppError(400, "INVALID_MOVIE_ID", "Movie ID must be a UUID");
  if (req.get("Content-Type")?.split(";")[0].toLowerCase() !== "video/mp4") throw new AppError(415, "VIDEO_TYPE_NOT_ALLOWED", "Upload an MP4 video using Content-Type: video/mp4");
  if (Number(req.get("Content-Length") || 0) > MAX_BYTES) throw new AppError(413, "VIDEO_TOO_LARGE", "MP4 video must be 2 GB or smaller");
  if (req.get("X-Movie-Rights-Confirmed") !== "true") throw new AppError(400, "RIGHTS_CONFIRMATION_REQUIRED", "Admin must confirm the right to distribute this title before upload");
  const prisma = getPrismaClient();
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie was not found");

  await mkdir(storageRoot, { recursive: true });
  const storageKey = `${randomUUID()}.mp4`;
  const finalPath = join(storageRoot, storageKey);
  const tempPath = `${finalPath}.upload`;
  let size = 0;
  let header = Buffer.alloc(0);
  const hash = createHash("sha256");
  const guard = new Transform({ transform(chunk, encoding, callback) {
    size += chunk.length;
    if (size > MAX_BYTES) return callback(new AppError(413, "VIDEO_TOO_LARGE", "MP4 video must be 2 GB or smaller"));
    if (header.length < 16) header = Buffer.concat([header, chunk.subarray(0, 16 - header.length)]);
    hash.update(chunk);
    callback(null, chunk);
  } });
  try {
    await pipeline(req, guard, createWriteStream(tempPath, { flags: "wx" }));
    if (size < 16 || header.toString("ascii", 4, 8) !== "ftyp") throw new AppError(415, "INVALID_MP4", "The uploaded file does not have a valid MP4 signature");
    await rename(tempPath, finalPath);
    const sha256 = hash.digest("hex");
    const old = await prisma.movieVideoAsset.findUnique({ where: { movieId }, select: { storageKey: true } });
    await prisma.$transaction(async (tx) => {
      const savedAsset = await tx.movieVideoAsset.upsert({
        where: { movieId },
        create: { movieId, storageKey, mimeType: "video/mp4", sizeBytes: BigInt(size), sha256, rightsConfirmed: true, status: "PENDING_REVIEW", uploadedBy: req.user.id },
        update: { storageKey, mimeType: "video/mp4", sizeBytes: BigInt(size), sha256, rightsConfirmed: true, status: "PENDING_REVIEW", uploadedBy: req.user.id, reviewedBy: null, reviewedAt: null },
      });
      await tx.auditLog.create({ data: { actorId: req.user.id, action: "MOVIE_VIDEO_UPLOADED", entityType: "MovieVideoAsset", entityId: savedAsset.id, metadata: { movieId, sizeBytes: size, rightsConfirmed: true } } });
    });
    if (old?.storageKey && old.storageKey !== storageKey) await rm(join(storageRoot, old.storageKey), { force: true });
    res.status(202).json({ data: { movieId, status: "PENDING_REVIEW", sizeBytes: size } });
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    await rm(finalPath, { force: true }).catch(() => {});
    throw error;
  }
});

router.get("/admin/video-review-queue", requireRole("admin"), async (req, res) => {
  const assets = await getPrismaClient().movieVideoAsset.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" }, include: { movie: { select: { id: true, title: true } } } });
  res.json({ data: assets.map(({ storageKey, sha256, sizeBytes, ...asset }) => ({ ...asset, sizeBytes: Number(sizeBytes) })) });
});

router.post("/admin/:movieId/video-review-token", requireRole("admin"), async (req, res) => {
  const asset = await getPrismaClient().movieVideoAsset.findFirst({ where: { movieId: req.params.movieId, status: "PENDING_REVIEW", rightsConfirmed: true }, select: { movieId: true } });
  if (!asset) throw new AppError(404, "VIDEO_NOT_PENDING", "No submitted video is awaiting review");
  const token = jwt.sign({ purpose: "movie_review", movieId: asset.movieId, role: "admin" }, config.jwtSecret, { expiresIn: "20m", algorithm: "HS256", issuer: config.jwtIssuer, audience: config.jwtAudience });
  res.set("Cache-Control", "no-store").json({ data: { streamUrl: `/movies/${asset.movieId}/stream?token=${encodeURIComponent(token)}`, expiresInSeconds: 1200 } });
});

router.post("/admin/:movieId/video-review", requireRole("admin"), async (req, res) => {
  const { movieId } = req.params;
  if (!uuid(movieId) || !["approve", "reject"].includes(req.body?.decision)) throw new AppError(400, "INVALID_REVIEW", "A valid movie and approve/reject decision are required");
  const status = req.body.decision === "approve" ? "PUBLISHED" : "REJECTED";
  const result = await getPrismaClient().$transaction(async (tx) => {
    const updated = await tx.movieVideoAsset.updateMany({ where: { movieId, status: "PENDING_REVIEW" }, data: { status, reviewedBy: req.user.id, reviewedAt: new Date() } });
    if (!updated.count) throw new AppError(409, "VIDEO_NOT_PENDING", "This video is no longer awaiting review");
    await tx.auditLog.create({ data: { actorId: req.user.id, action: `MOVIE_VIDEO_${status}`, entityType: "MovieVideoAsset", metadata: { movieId } } });
    return { movieId, status };
  });
  res.json({ data: result });
});

router.post("/:movieId/playback-token", async (req, res) => {
  await getMoviePlayback(req.user.id, req.params.movieId, req.user.role === "admin");
  const token = jwt.sign({ purpose: "movie_playback", movieId: req.params.movieId, userId: req.user.id, role: req.user.role }, config.jwtSecret, { expiresIn: "6h", algorithm: "HS256", issuer: config.jwtIssuer, audience: config.jwtAudience });
  res.set("Cache-Control", "no-store").json({ data: { streamUrl: `/movies/${req.params.movieId}/stream?token=${encodeURIComponent(token)}`, expiresInSeconds: 21600 } });
});

async function streamFile(req, res, storageKey) {
  const path = join(storageRoot, storageKey);
  const file = await stat(path).catch(() => null);
  if (!file?.isFile()) throw new AppError(404, "VIDEO_FILE_MISSING", "The approved video asset is unavailable");
  const range = req.get("Range");
  res.set({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  if (!range) {
    res.set("Content-Length", String(file.size));
    return pipeline(createReadStream(path), res);
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) { res.status(416).set("Content-Range", `bytes */${file.size}`).end(); return; }
  const start = match[1] ? Number(match[1]) : Math.max(0, file.size - Number(match[2]));
  const end = match[2] && match[1] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= file.size) { res.status(416).set("Content-Range", `bytes */${file.size}`).end(); return; }
  res.status(206).set({ "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${file.size}` });
  return pipeline(createReadStream(path, { start, end }), res);
}

export default router;
