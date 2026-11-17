# Booking payment API (PromptPay + Stripe + mock)

All routes require a bearer access token. Routes marked **Admin** enforce `requireRole("admin")` on the server; hiding navbar links is not an authorization control.

Base path: `/api/v1/payments` (the frontend also uses the `/api/payments` compatibility mount with the same handlers).

## Customer PromptPay flow

1. `POST /api/payments/promptpay/checkout` with `{ "bookingId": "<uuid>" }`.
   Creates or resumes a `PENDING` payment with `provider=PROMPTPAY` and extends the seat hold to two hours. Returns:
   - `paymentId`, `provider: "promptpay"`, `bookingId`
   - `amount` (string, two decimals) and `currency`
   - `promptPayId`, `reference`
   - `payload` — EMVCo PromptPay payload with the amount embedded
   - `expiresAt`, and `status` (`AWAITING_TRANSFER` or `UNDER_REVIEW`)
2. Render `payload` as a QR code in the browser. The customer confirms the recipient and amount in their banking app.
3. `POST /api/payments/promptpay/{paymentId}/proof` sends the raw slip bytes with `Content-Type: image/png` or `image/jpeg` and a maximum of 5 MB. The server verifies the image signature and stores a SHA-256 hash. The same slip cannot be submitted for two different payments. Resubmitting before review replaces the previous slip.
4. `GET /api/payments/promptpay/{paymentId}` reports `payment.status` (`PENDING`, `SUCCEEDED`, `FAILED`) and `bookingStatus`. When `bookingStatus=CONFIRMED` the ticket exists and the client can open the ticket page.

Approval is manual. PromptPay itself cannot notify this application that a transfer happened.

## Admin slip review

- `GET /api/payments/admin/promptpay/review-queue` lists pending payments that have a slip, including the booking, seats, showtime, and user.
- `GET /api/payments/admin/promptpay/{paymentId}/proof` returns the private slip bytes with `Cache-Control: private, no-store`.
- `POST /api/payments/admin/promptpay/{paymentId}/review` with `{ "decision": "approve" | "reject", "note": "..." }`.
  - `approve` settles the payment through the same transaction as Stripe/mock: payment becomes `SUCCEEDED`, booking `CONFIRMED`, held seats `CONFIRMED`, and a signed ticket row is created. It fails with `409 BOOKING_EXPIRED` if the hold lapsed, or `409 RESERVATION_LOST` if a seat is no longer held.
  - `reject` marks the payment `FAILED` and stores the review note; the customer can create a new QR.
  - Both decisions are audit logged and idempotency is enforced by the `PENDING` guard; a second review returns `409 ALREADY_REVIEWED`.

## Stripe and mock

- `POST /api/payments/checkout` with `{ "bookingId": "<uuid>" }` starts the configured provider (`mock` in development, `stripe` in production).
- `POST /api/payments/mock/{paymentId}/confirm` is unavailable in production and when `PAYMENT_PROVIDER` is not `mock`.
- `POST /api/payments/webhooks/stripe` verifies the Stripe signature and deduplicates event IDs.

## Database

The booking slip flow stores images in `payment_proofs` (one row per payment, unique `sha256`). Apply the migration before starting the API:

```bash
cd backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

## Known limitations

- No automatic bank confirmation: every PromptPay slip needs an administrator.
- Proof images are stored as database `BYTEA`; production should move them to a private object store with lifecycle rules.
- Admin CRUD currently covers create + read for movies, cinemas, screens, and showtimes; update/delete endpoints do not exist yet.
