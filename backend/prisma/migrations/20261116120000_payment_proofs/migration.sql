-- Manual PromptPay payment proofs for cinema bookings.
-- Additive migration: does not alter existing payment or booking rows.

CREATE TABLE "payment_proofs" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "note" VARCHAR(500),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_proofs_payment_id_key" ON "payment_proofs"("payment_id");
CREATE UNIQUE INDEX "payment_proofs_sha256_key" ON "payment_proofs"("sha256");
CREATE INDEX "payment_proofs_reviewed_by_idx" ON "payment_proofs"("reviewed_by");

ALTER TABLE "payment_proofs"
    ADD CONSTRAINT "payment_proofs_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_proofs"
    ADD CONSTRAINT "payment_proofs_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
