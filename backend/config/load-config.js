const parseOrigins = (value) =>
  value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 5000);
  const nodeEnv = env.NODE_ENV || "development";
  const configuredOrigins = parseOrigins(
    env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173"
  );
  // Local Vite can be opened as either localhost or 127.0.0.1; both are the
  // same dev server but browsers treat them as different CORS origins.
  const frontendOrigins = nodeEnv === "production"
    ? configuredOrigins
    : Array.from(new Set([...configuredOrigins, "http://localhost:5173", "http://127.0.0.1:5173"]));
  const jwtExpiresIn = env.JWT_EXPIRES_IN || "15m";
  const paymentProvider = env.PAYMENT_PROVIDER || "mock";
  const reservationTtlSeconds = Number(env.RESERVATION_TTL_SECONDS || (paymentProvider === "stripe" ? 1800 : 600));

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || /replace|example|placeholder/i.test(env.JWT_SECRET)) {
    throw new Error("JWT_SECRET must contain at least 32 non-placeholder characters");
  }

  if (!env.DATABASE_URL || !env.DATABASE_URL.startsWith("postgresql://") && !env.DATABASE_URL.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!/^\d+[smhd]$/.test(jwtExpiresIn)) {
    throw new Error("JWT_EXPIRES_IN must be an integer duration such as 15m, 2h, or 7d");
  }
  if (!Number.isInteger(reservationTtlSeconds) || reservationTtlSeconds < (paymentProvider === "stripe" ? 1800 : 60) || reservationTtlSeconds > 7200) {
    throw new Error(`RESERVATION_TTL_SECONDS must be between ${paymentProvider === "stripe" ? 1800 : 60} and 7200 for ${paymentProvider}`);
  }
  if (!new Set(["mock", "stripe"]).has(paymentProvider)) {
    throw new Error("PAYMENT_PROVIDER must be either mock or stripe");
  }
  if (nodeEnv === "production" && paymentProvider !== "stripe") {
    throw new Error("Production requires PAYMENT_PROVIDER=stripe");
  }
  if (paymentProvider === "stripe" && (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET)) {
    throw new Error("Stripe provider requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET");
  }

  const promptPayId = env.PROMPTPAY_ID || "0860068644";
  const promptPayDigits = String(promptPayId).replace(/\D/g, "");
  if (!/^(0\d{9}|66\d{9}|0066\d{9}|\d{13}|\d{15})$/.test(promptPayDigits)) {
    throw new Error("PROMPTPAY_ID must be a 10-digit mobile number, a 13-digit national/tax ID, or a 15-digit e-wallet ID");
  }

  return Object.freeze({
    port,
    frontendOrigins: Object.freeze(frontendOrigins),
    jwtSecret: env.JWT_SECRET,
    jwtIssuer: env.JWT_ISSUER || "moviehub-api",
    jwtAudience: env.JWT_AUDIENCE || "moviehub-client",
    jwtExpiresIn,
    refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    databaseUrl: env.DATABASE_URL,
    paymentProvider,
    stripeSecretKey: env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || "",
    promptPayId,
    appBaseUrl: env.APP_BASE_URL || "http://localhost:5173",
    apiBaseUrl: env.API_BASE_URL || `http://localhost:${port}`,
    reservationTtlSeconds,
    nodeEnv,
  });
}
