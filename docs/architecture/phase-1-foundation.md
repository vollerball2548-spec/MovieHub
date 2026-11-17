# MovieHub Phase 1: Foundation & Architecture

This is the Phase 1 checkpoint record. Its implementation constraints predate the subsequent PostgreSQL runtime and booking implementation described in the repository README and API contract.

## Scope and decisions

- Deploy as one modular monolith. Modules communicate through application services, not by importing another module's persistence models.
- Initial module boundaries: `auth`, `catalog`, `cinema`, `scheduling`, `booking`, `payment`, `ticket`, and `admin`.
- `shared` contains cross-cutting HTTP errors, request validation, configuration, and infrastructure adapters. It must not become a home for domain rules.
- Preserve MongoDB as the active adapter in this phase. PostgreSQL and Prisma belong to Phase 2.
- `/api/v1` is the target HTTP prefix. The existing `/api` routes remain temporary compatibility mounts for the current client.
- Booking creation remains disabled until reservation/payment workflows are implemented. Catalog administration and cross-user booking reads require the admin role. Existing booking history remains readable to its owner.

## Module dependency direction

```text
HTTP routes/controllers -> application services -> domain rules
                                      |                 |
                                      +-> repositories <-+
                                                |
                                      Mongo adapter (now)
                                      Prisma adapter (Phase 2)
```

Suggested module layout:

```text
backend/
  modules/{auth,catalog,cinema,scheduling,booking,payment,ticket,admin}/
    *.routes.js
    *.controller.js
    *.service.js
    *.repository.js
    *.schema.js
  shared/{errors,middleware,observability}/
  infrastructure/{database,logging}/
```

Current legacy `routes/` and `models/` remain as a migration bridge. New domain behavior must not be added there; move each route behind its module service before replacing its repository.

## HTTP contract

Success responses return the resource or collection directly for the compatibility API. New `/api/v1` endpoints should use this envelope:

```json
{ "data": {}, "meta": { "requestId": "..." } }
```

Versioned collection responses use this envelope (including a request ID):

```json
{ "data": [], "meta": { "page": 1, "pageSize": 24, "total": 0, "totalPages": 0, "requestId": "..." } }
```

Errors use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed", "details": {}, "requestId": "..." } }
```

Validation is performed at the HTTP boundary; controllers call application services with validated values. Never accept price, ownership, payment state, or seat availability as authoritative client input. All collection endpoints should paginate. Admin routes require explicit role authorization and audit events.

## Target endpoint groups

| Area | Route | Access |
|---|---|---|
| Health | `GET /health/live`, `GET /health/ready` | Public probes |
| Auth | `POST /api/v1/auth/register`, `POST /login`, `POST /refresh`, `POST /logout` | Public/session |
| Catalog | `GET /api/v1/movies`, `GET /movies/{movieId}` | Public |
| Cinema | `GET /api/v1/cinemas`, `GET /cinemas/{cinemaId}` | Public |
| Scheduling | `GET /api/v1/showtimes?movieId=&cinemaId=&date=`, `GET /showtimes/{id}/seats` | Public |
| Booking | `POST /api/v1/bookings/holds`, `POST /bookings/{id}/checkout`, `GET /bookings`, `GET /bookings/{id}` | Authenticated; ownership checked |
| Payment | `POST /api/v1/payments/webhooks/{provider}` | Provider signature verification |
| Ticket | `GET /api/v1/tickets/{id}`, `POST /tickets/{id}/redeem` | Owner / authorized staff |
| Admin | `/api/v1/admin/{movies,cinemas,showtimes,bookings}` | Explicit admin role |

The table describes the target contract, not implemented endpoints. Booking, payment, cinema and scheduling APIs are delivered in later phases.

## Security baseline

- Fail startup on invalid port, missing Mongo connection setting, or missing/placeholder JWT secret.
- Limit JSON payload to 1 MiB, disable the Express fingerprint header, and only grant credentialed CORS to configured origins.
- JWT verification pins HS256 and validates issuer/audience. Access tokens stay in browser memory; refresh tokens are opaque, hashed in MongoDB, rotated, and set as HttpOnly cookies. Cookie auth endpoints require a configured Origin. Login failure text is generic; registration password length is 12–128 characters.
- Admin movie writes and all-booking reads require the explicit `admin` role; ordinary users receive `403`.
- Booking creation returns `503` until the server can reserve seats and verify payment safely.
- Keep secrets out of source control. Rate limits are process-local and refresh sessions are Mongo-backed; use distributed rate limiting, centralized log storage, deployment secrets and CI before scaling or production release. Admin role assignment is an operations-only database task until an audited admin provisioning flow exists.

## Phase 1 acceptance checklist

- [x] Add environment validation and fail fast before opening the HTTP listener.
- [x] Establish module route boundaries and extract authentication, catalog and booking into route/controller/service/repository layers while retaining compatibility wrappers.
- [x] Add liveness/readiness probes, consistent error middleware, request validation hook and request IDs.
- [x] Version the target API and document module boundaries and contract.
- [x] Close unauthenticated admin endpoints and unsafe booking creation.
- [x] Add bounded request/auth rate limits, baseline security headers, role checks and rotating HttpOnly refresh sessions.
- [x] Add catalog write validation and paginated list/history APIs.
- [x] Add frontend refresh retry, cookie credentials and server-side logout call.
- [x] Keep browser access tokens in memory instead of persistent browser storage.
- [x] Add API specification document.

Phase 1 foundation is complete. Distributed rate limiting, centralized log storage and CI are deployment/release hardening tasks; the current API rate limiter is in-memory and should run as a single instance until shared infrastructure is configured.

## Migration compatibility notes

The existing browser app continues calling `/api`; those paths are temporary aliases to module routes. Login tokens issued before Phase 1 do not contain the required issuer/audience/type claims and will need a fresh login. Existing UI payment attempts receive `BOOKING_NOT_READY`; this is deliberate because the previous endpoint trusted client-supplied price and seat data. Rate limiting is in-memory and therefore applies per process; use a shared store before running multiple instances. Do not expose the service as a real ticketing/payment system until the later booking and payment phases are complete.
