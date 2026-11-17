import { Router } from "express";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";

const router = Router();

router.get("/live", (req, res) => {
  res.json({ status: "ok", service: "moviehub-api" });
});

router.get("/ready", async (req, res) => {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    res.json({ status: "ok", dependencies: { database: "connected" } });
  } catch {
    res.status(503).json({ status: "unavailable", dependencies: { database: "disconnected" } });
  }
});

export default router;
