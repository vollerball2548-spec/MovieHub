CREATE TYPE "movie_purchase_status" AS ENUM ('AWAITING_PAYMENT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "movie_video_status" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

CREATE TABLE "movie_purchases" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "movie_id" UUID NOT NULL,
  "status" "movie_purchase_status" NOT NULL DEFAULT 'AWAITING_PAYMENT',
  "amount" DECIMAL(12,2) NOT NULL DEFAULT 50,
  "currency" CHAR(3) NOT NULL DEFAULT 'THB',
  "proof_mime_type" VARCHAR(40),
  "proof_bytes" BYTEA,
  "proof_hash" CHAR(64),
  "reviewed_by" UUID,
  "review_note" VARCHAR(500),
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "movie_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movie_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "movie_purchases_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "movie_purchases_user_id_movie_id_key" ON "movie_purchases"("user_id", "movie_id");
CREATE INDEX "movie_purchases_status_created_at_idx" ON "movie_purchases"("status", "created_at");
CREATE INDEX "movie_purchases_reviewed_by_idx" ON "movie_purchases"("reviewed_by");
ALTER TABLE "movie_purchases" ADD CONSTRAINT "movie_purchases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "movie_video_assets" (
  "id" UUID NOT NULL,
  "movie_id" UUID NOT NULL,
  "storage_key" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(40) NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "rights_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" "movie_video_status" NOT NULL DEFAULT 'PENDING_REVIEW',
  "uploaded_by" UUID NOT NULL,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "movie_video_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "movie_video_assets_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "movie_video_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "movie_video_assets_movie_id_key" ON "movie_video_assets"("movie_id");
CREATE UNIQUE INDEX "movie_video_assets_storage_key_key" ON "movie_video_assets"("storage_key");
CREATE INDEX "movie_video_assets_status_created_at_idx" ON "movie_video_assets"("status", "created_at");
CREATE INDEX "movie_video_assets_reviewed_by_idx" ON "movie_video_assets"("reviewed_by");
ALTER TABLE "movie_video_assets" ADD CONSTRAINT "movie_video_assets_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
