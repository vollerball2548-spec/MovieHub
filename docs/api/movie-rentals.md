# Movie rental API

All routes use the existing bearer access token. Routes marked **Admin** require `role=ADMIN` on the server; hiding the admin page in the UI is not an authorization control.

## Customer purchase flow

1. `POST /api/movie-purchases` with `{ "movieId": "<uuid>" }` starts or resumes a THB 50 purchase. Returns `409 MOVIE_NOT_AVAILABLE` until an authorized MP4 is uploaded and approved.
2. Call `GET /api/movie-purchases/{purchaseId}/qr` to receive the dynamic PromptPay payload (`payload`, `amount`, `currency`, `reference`). The amount due is embedded in the QR, so the customer only needs to confirm the recipient and amount in their banking app.
3. `POST /api/movie-purchases/{purchaseId}/proof` sends the raw PNG/JPEG bytes with matching `Content-Type`. Maximum 5 MB. Server checks the image signature and stores it for manual review; this does not prove that a transfer occurred.
4. `GET /api/movie-purchases/mine` reports `AWAITING_PAYMENT`, `UNDER_REVIEW`, `APPROVED`, or `REJECTED`.
5. Once the transfer is checked by an admin and the purchase is `APPROVED`, call `POST /api/movies/{movieId}/playback-token`. Its short-lived response URL supports HTTP byte ranges for browser playback.

## Admin payment review

- `GET /api/movie-purchases/admin/review-queue`
- `GET /api/movie-purchases/admin/{purchaseId}/proof` returns private image bytes (`no-store`).
- `POST /api/movie-purchases/admin/{purchaseId}/review` with `{ "decision": "approve" | "reject", "note": "..." }` is atomic and audit logged. A repeated review returns conflict.

## Admin video review and upload

- `PUT /api/movies/admin/{movieId}/video` accepts a raw MP4 body, `Content-Type: video/mp4`, and `X-Movie-Rights-Confirmed: true`. MP4 `ftyp` signature is checked; maximum size 2 GB; maximum three uploads per hour per IP. Video is not published at upload time.
- `GET /api/movies/admin/video-review-queue` lists pending uploads.
- `POST /api/movies/admin/{movieId}/video-review-token` returns a short-lived admin preview URL.
- `POST /api/movies/admin/{movieId}/video-review` with `{ "decision": "approve" | "reject" }` records the result. Only a published asset with the operator rights attestation can be purchased or streamed.

The dynamic PromptPay QR embeds the recipient and the exact amount due, but it still cannot notify this application about a transfer. Automated confirmation needs a payment provider/bank integration that supplies signed transaction webhooks. MP4 files currently use private local disk storage (`backend/storage/videos`); production needs a persistent private object store, backups, and media scanning/transcoding before large-scale use.
