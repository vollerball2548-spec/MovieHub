import { createHash } from "node:crypto";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../config/env.js";
import { buildPromptPayPayload } from "../payment/promptpay.js";

const prisma = () => getPrismaClient();
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
const safePurchase = ({ proofBytes, proofHash, ...purchase }) => purchase;

export async function startMoviePurchase(userId, movieId) {
  if (!uuid(movieId)) throw new AppError(400, "INVALID_MOVIE_ID", "Movie ID must be a UUID");
  const movie = await prisma().movie.findUnique({ where: { id: movieId }, select: { id: true, title: true } });
  if (!movie) throw new AppError(404, "MOVIE_NOT_FOUND", "Movie was not found");
  const video = await prisma().movieVideoAsset.findUnique({ where: { movieId }, select: { status: true, rightsConfirmed: true } });
  if (video?.status !== "PUBLISHED" || !video.rightsConfirmed) throw new AppError(409, "MOVIE_NOT_AVAILABLE", "This title is not available for purchase yet");
  const prior = await prisma().moviePurchase.findUnique({ where: { userId_movieId: { userId, movieId } } });
  if (prior?.status === "APPROVED") return safePurchase(prior);
  if (prior?.status === "UNDER_REVIEW") return safePurchase(prior);
  const purchase = await prisma().moviePurchase.upsert({
    where: { userId_movieId: { userId, movieId } },
    create: { userId, movieId, amount: 50, currency: "THB" },
    update: { status: "AWAITING_PAYMENT", proofBytes: null, proofMimeType: null, proofHash: null, reviewNote: null, reviewedAt: null, reviewedBy: null },
  });
  return { ...safePurchase(purchase), movieTitle: movie.title };
}

export async function getPurchaseQr(userId, purchaseId) {
  if (!uuid(purchaseId)) throw new AppError(400, "INVALID_PURCHASE_ID", "Purchase ID must be a UUID");
  const purchase = await prisma().moviePurchase.findFirst({
    where: { id: purchaseId, userId },
    select: { id: true, status: true, amount: true, currency: true, movie: { select: { title: true } } },
  });
  if (!purchase) throw new AppError(404, "PURCHASE_NOT_FOUND", "Purchase was not found");
  if (!["AWAITING_PAYMENT", "REJECTED"].includes(purchase.status)) {
    throw new AppError(409, "PURCHASE_NOT_PAYABLE", "This purchase is no longer awaiting payment");
  }
  const amount = Number(purchase.amount);
  return {
    purchaseId: purchase.id,
    movieTitle: purchase.movie.title,
    amount: amount.toFixed(2),
    currency: purchase.currency,
    promptPayId: config.promptPayId,
    reference: `MH${purchase.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`,
    payload: buildPromptPayPayload({ promptPayId: config.promptPayId, amount }),
  };
}

export async function submitPaymentProof(userId, purchaseId, mimeType, bytes) {
  if (!uuid(purchaseId)) throw new AppError(400, "INVALID_PURCHASE_ID", "Purchase ID must be a UUID");
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw new AppError(400, "INVALID_PROOF", "Payment proof must be a 12-byte to 5 MB JPEG or PNG image");
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if ((mimeType === "image/png" && !isPng) || (mimeType === "image/jpeg" && !isJpeg) || (!isPng && !isJpeg)) {
    throw new AppError(415, "UNSUPPORTED_PROOF", "Only genuine PNG and JPEG image files are accepted");
  }
  const result = await prisma().moviePurchase.updateMany({
    where: { id: purchaseId, userId, status: { in: ["AWAITING_PAYMENT", "REJECTED"] } },
    data: { status: "UNDER_REVIEW", proofMimeType: isPng ? "image/png" : "image/jpeg", proofBytes: bytes, proofHash: createHash("sha256").update(bytes).digest("hex"), reviewNote: null, reviewedAt: null, reviewedBy: null },
  });
  if (!result.count) throw new AppError(409, "PURCHASE_NOT_SUBMITTABLE", "Purchase was not found or is already being reviewed");
  return prisma().moviePurchase.findUnique({ where: { id: purchaseId }, select: { id: true, status: true, amount: true, currency: true, updatedAt: true } });
}

export async function listMyMoviePurchases(userId) {
  return (await prisma().moviePurchase.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { movie: { select: { id: true, title: true, posterUrl: true } } } })).map(safePurchase);
}

export async function listReviewQueue() {
  return prisma().moviePurchase.findMany({ where: { status: "UNDER_REVIEW" }, orderBy: { createdAt: "asc" }, select: { id: true, amount: true, currency: true, createdAt: true, proofMimeType: true, user: { select: { id: true, username: true, email: true } }, movie: { select: { id: true, title: true } } } });
}

export async function getPurchaseProof(purchaseId) {
  const purchase = await prisma().moviePurchase.findUnique({ where: { id: purchaseId }, select: { proofBytes: true, proofMimeType: true, status: true } });
  if (!purchase?.proofBytes) throw new AppError(404, "PROOF_NOT_FOUND", "Payment proof was not found");
  return purchase;
}

export async function reviewMoviePurchase(adminId, purchaseId, decision, note) {
  if (!uuid(purchaseId) || !["approve", "reject"].includes(decision)) throw new AppError(400, "INVALID_REVIEW", "A valid purchase and approve/reject decision are required");
  if (note !== undefined && (typeof note !== "string" || note.length > 500)) throw new AppError(400, "INVALID_NOTE", "Review note must be up to 500 characters");
  const status = decision === "approve" ? "APPROVED" : "REJECTED";
  return prisma().$transaction(async (tx) => {
    const changed = await tx.moviePurchase.updateMany({ where: { id: purchaseId, status: "UNDER_REVIEW" }, data: { status, reviewedBy: adminId, reviewedAt: new Date(), reviewNote: note?.trim() || null } });
    if (!changed.count) throw new AppError(409, "ALREADY_REVIEWED", "This payment proof is no longer awaiting review");
    const result = await tx.moviePurchase.findUnique({ where: { id: purchaseId }, select: { id: true, userId: true, movieId: true, status: true, amount: true, currency: true, reviewedAt: true, reviewNote: true } });
    await tx.auditLog.create({ data: { actorId: adminId, action: `MOVIE_PURCHASE_${status}`, entityType: "MoviePurchase", entityId: purchaseId, metadata: { movieId: result.movieId, amount: Number(result.amount) } } });
    return result;
  });
}

export async function getMoviePlayback(userId, movieId, isAdmin = false) {
  if (!uuid(movieId)) throw new AppError(400, "INVALID_MOVIE_ID", "Movie ID must be a UUID");
  const asset = await prisma().movieVideoAsset.findUnique({ where: { movieId }, include: { movie: { select: { id: true, title: true } } } });
  if (!asset || asset.status !== "PUBLISHED" || !asset.rightsConfirmed) throw new AppError(404, "MOVIE_NOT_AVAILABLE", "This movie is not currently available to stream");
  if (!isAdmin) {
    const purchase = await prisma().moviePurchase.findUnique({ where: { userId_movieId: { userId, movieId } }, select: { status: true } });
    if (purchase?.status !== "APPROVED") throw new AppError(403, "PURCHASE_REQUIRED", "Purchase approval is required to watch this movie");
  }
  return { asset, movie: asset.movie };
}
