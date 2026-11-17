CREATE TABLE "payment_events" (
  "id" UUID NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "event_id" VARCHAR(160) NOT NULL,
  "event_type" VARCHAR(120) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3),
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider", "event_id");
CREATE INDEX "payment_events_received_at_idx" ON "payment_events"("received_at");
