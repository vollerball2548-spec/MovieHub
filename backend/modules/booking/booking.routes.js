import { Router } from "express";
import { cancelBooking, getAllBookings, getBooking, getMyBookings, postHold } from "./booking.controller.js";
import { authenticate, requireRole } from "../../shared/middleware/authenticate.js";
import { validatePagination } from "../../shared/middleware/validate-request.js";
import { AppError } from "../../shared/errors/app-error.js";

const router = Router();

function validateBody(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return next(new AppError(400, "VALIDATION_ERROR", "Request body must be an object"));
  }
  next();
}

router.post("/", authenticate, validateBody, postHold);
router.post("/holds", authenticate, validateBody, postHold);
router.get("/", authenticate, validatePagination({ defaultPageSize: 20 }), getMyBookings);
router.get("/all", authenticate, requireRole("admin"), validatePagination({ defaultPageSize: 20 }), getAllBookings);
router.get("/:bookingId", authenticate, getBooking);
router.post("/:bookingId/cancel", authenticate, cancelBooking);

export default router;
