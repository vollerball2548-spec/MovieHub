import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "./config/env.js";
import { getPrismaClient, disconnectPrisma } from "./infrastructure/database/prisma.js";
import authRoutes from "./modules/auth/auth.routes.js";
import catalogRoutes from "./modules/catalog/catalog.routes.js";
import bookingRoutes from "./modules/booking/booking.routes.js";
import cinemaRoutes from "./modules/cinema/cinema.routes.js";
import showtimeRoutes from "./modules/scheduling/scheduling.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import ticketRoutes from "./modules/ticket/ticket.routes.js";
import purchaseRoutes from "./modules/movie-purchase/purchase.routes.js";
import movieVideoRoutes from "./modules/movie-purchase/video.routes.js";
import healthRoutes from "./modules/health/health.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middleware/error-handler.js";
import { securityHeaders } from "./shared/middleware/security-headers.js";
import { rateLimit } from "./shared/middleware/rate-limit.js";
import { parseCookies } from "./shared/middleware/cookies.js";
import { requestContext } from "./shared/middleware/request-context.js";
import { requestLogger } from "./shared/middleware/request-logger.js";
import { logger } from "./shared/logger.js";

export const app = express();

app.disable("x-powered-by");
app.use(requestContext);
app.use(requestLogger);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb", verify(req, res, buffer) {
  if (req.originalUrl.includes("/payments/webhooks/stripe")) req.rawBody = Buffer.from(buffer);
} }));
app.use(parseCookies);
app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));

app.use("/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/movies", catalogRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/cinemas", cinemaRoutes);
app.use("/api/v1/showtimes", showtimeRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/tickets", ticketRoutes);
app.use("/api/v1/movie-purchases", purchaseRoutes);
app.use("/api/v1/movies", movieVideoRoutes);

// Temporary compatibility mounts; remove after frontend migration.
app.use("/api/auth", authRoutes);
app.use("/api/movies", catalogRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/showtimes", showtimeRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/movie-purchases", purchaseRoutes);
app.use("/api/movies", movieVideoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer() {
  const prisma = getPrismaClient();
  await prisma.$connect();
  const server = app.listen(config.port, () => logger.info("MovieHub API listening", { port: config.port }));
  const reservationCleanup = setInterval(() => {
    import("./modules/booking/booking.service.js").then(({ expirePendingReservations }) => expirePendingReservations())
      .catch((error) => logger.error("Reservation cleanup failed", { error: error.message }));
  }, 60_000);
  reservationCleanup.unref();
  server.on("close", () => clearInterval(reservationCleanup));
  server.on("close", () => disconnectPrisma().catch((error) => logger.error("Database disconnect failed", { error: error.message })));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startServer().catch((error) => {
    logger.error("Server startup failed", { error: error.message });
    process.exitCode = 1;
  });
}
