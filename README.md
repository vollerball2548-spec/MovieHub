# MovieHub

MovieHub is a Vue 3 + Vite frontend and Node.js + Express modular monolith backed by PostgreSQL through Prisma 7. The API provides authentication, catalog, cinema/screen management, showtimes, transactional seat holds, checkout, signed payment webhooks, booking history, and one-time ticket redemption.

## Local development

Requirements: Node.js 20.19+ (or 22.12+), npm, and PostgreSQL 16 (Docker Desktop with Compose is optional).

1. Start PostgreSQL. Either run `docker compose up -d postgres` from the repository root, or use a locally installed server. In this workspace a portable PostgreSQL 16 lives at `C:\Users\admin\pgsql`: start it with `C:\Users\admin\pgsql\start-postgres.ps1`, stop it with `stop-postgres.ps1`, and check it with `status-postgres.ps1`. It listens on `127.0.0.1:5432` and already has the `moviehub` database, `moviehub` role, and all migrations.
2. Copy `backend/.env.example` to `backend/.env`. Set a unique random `JWT_SECRET` (at least 32 characters). The example database URL matches the Compose default password; if `POSTGRES_PASSWORD` differs, update `DATABASE_URL` too. Machine-specific values can go in `backend/.env.local`, which is git-ignored and takes precedence over `.env` without modifying the shared file.
3. In `backend`, run `npm install`, then `npm run prisma:migrate:deploy`, `npm run prisma:generate`, and `npm run seed`.
4. Optional: set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (8–128 characters), and `SEED_ADMIN_USERNAME` before seeding to create/update an administrator. Set the corresponding `SEED_STAFF_*` values to create a ticket-checking staff account. Without these values the seed does not create privileged accounts.
5. In `frontend/moviehub-frontend`, run `npm install`, then `npm run dev`.
6. Run the API with `npm run dev` from `backend`; the frontend uses `http://localhost:5000/api` by default.

The idempotent seed creates sample films, two cinemas, screens, seats, and seven days of sample showtimes. Development uses `PAYMENT_PROVIDER=mock`; the mock confirmation endpoint is unavailable in production. The mock flow issues real server-signed ticket payloads and can be used locally end to end.

## PromptPay QR

The pay-per-title flow generates a dynamic PromptPay QR per purchase. Set `PROMPTPAY_ID` in `backend/.env` (defaults to `0860068644`) to a 10-digit mobile number, a 13-digit national/tax ID, or a 15-digit e-wallet ID. The backend builds an EMVCo payload that embeds the exact amount due; the customer scans it, transfers the shown amount, then uploads a slip for admin review. There is still no automatic bank confirmation, so an administrator must approve the slip.

The same PromptPay + slip flow is available for cinema ticket bookings:

1. The customer holds seats, opens the payment page, and requests a QR with `POST /payments/promptpay/checkout`.
2. The reservation is extended to two hours so the transfer and slip review can complete.
3. The customer uploads a PNG/JPEG slip (`POST /payments/promptpay/:paymentId/proof`).
4. An administrator reviews the queue (`GET /payments/admin/promptpay/review-queue`) and approves or rejects it. Approval reuses the same settling transaction as Stripe, so the ticket is only issued while the reservation is still valid and the amount matches.

Administrators reach the review and catalog screens from the navbar (`ตรวจรายการ` and `จัดการโรงหนัง`). JWT roles decide what the navbar shows, while the API itself enforces `requireRole("admin")` on every admin route.

The booking flow needs the `payment_proofs` table. After pulling this change, run `npm run prisma:migrate:deploy` and `npm run prisma:generate` in `backend` before starting the API.

## Production payment setup

Set `NODE_ENV=production`, `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Set `APP_BASE_URL`, `API_BASE_URL`, `FRONTEND_URL`, and `DATABASE_URL` to deployed HTTPS services. Configure Stripe to deliver `checkout.session.completed` and `checkout.session.expired` to `/api/v1/payments/webhooks/stripe`. The application verifies Stripe signatures and deduplicates event IDs.

The Stripe checkout reserves seats for the checkout window. If a provider reports payment after the reservation has expired, the booking is flagged `REFUND_PENDING`; an operator must issue the refund through Stripe and record completion. Automated refunds and operational dashboards are not included yet.

## MongoDB migration

MongoDB is retained only as an optional source for the migration script. Profile first with `npm run data:migrate:mongodb -- --dry-run`; apply only after configuring both source `MONGO_URI` and destination `DATABASE_URL`, then run with `--apply`. The importer requires review of its mapping report before production cutover; it does not migrate historical payments/tickets as valid paid records.

## API overview

Base path: `/api/v1` (the frontend's `/api` compatibility routes are also mounted).

- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- `GET /movies`, `GET /movies/:movieId`; admin `POST /movies`
- `GET /cinemas`, `GET /cinemas/:cinemaId`; admin `POST /cinemas`, `POST /cinemas/:cinemaId/screens`
- `GET /showtimes?movieId=<uuid>&cinemaId=<uuid>&date=YYYY-MM-DD`
- `GET /showtimes/:showtimeId/seats`; admin `POST /showtimes`
- `POST /bookings/holds` with `Idempotency-Key`; `GET /bookings`, `GET /bookings/:bookingId`, `POST /bookings/:bookingId/cancel`
- `POST /payments/checkout`; development only `POST /payments/mock/:paymentId/confirm`; Stripe webhook `POST /payments/webhooks/stripe`
- `POST /payments/promptpay/checkout`, `GET /payments/promptpay/:paymentId`, `POST /payments/promptpay/:paymentId/proof`
- Admin: `GET /payments/admin/promptpay/review-queue`, `GET /payments/admin/promptpay/:paymentId/proof`, `POST /payments/admin/promptpay/:paymentId/review`
- `GET /tickets/booking/:bookingId`; staff/admin `POST /tickets/redeem`
- `/health/live`, `/health/ready`

Pay-per-title additions:

- `POST /movie-purchases` with `{ "movieId": "<uuid>" }`
- `GET /movie-purchases/:purchaseId/qr` (owner): dynamic PromptPay payload, amount due, currency, and reference
- `POST /movie-purchases/:purchaseId/proof` with raw PNG/JPEG bytes
- Admin review queue, proof retrieval, and approve/reject endpoints

Hold body: `{ "showtimeId": "<uuid>", "seatIds": ["<seat-uuid>"] }`. A hold accepts 1–8 distinct seats and returns a pending booking with its server-calculated price. Never use client-supplied prices or ticket payloads as proof of payment.

## Architecture and database docs

See [Phase 1 foundation](docs/architecture/phase-1-foundation.md), [Phase 2 PostgreSQL migration](docs/database/phase-2-postgres-migration.md), [booking payment API](docs/api/payments.md), and [OpenAPI draft](docs/api/openapi.yaml).
