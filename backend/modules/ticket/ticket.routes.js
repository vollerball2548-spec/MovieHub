import { Router } from "express";
import { getBookingTicket, postRedeemTicket } from "./ticket.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";

const router = Router();
router.get("/booking/:bookingId", authenticate, getBookingTicket);
router.post("/redeem", authenticate, requireRole("staff", "admin"), postRedeemTicket);
export default router;
