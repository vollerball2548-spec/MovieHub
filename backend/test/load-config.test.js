import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../config/load-config.js";

const baseEnv = {
  PORT: "5000",
  JWT_SECRET: "a".repeat(40),
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NODE_ENV: "development",
};

test("loads defaults and freezes the config", () => {
  const config = loadConfig(baseEnv);
  assert.equal(config.paymentProvider, "mock");
  assert.equal(config.promptPayId, "0860068644");
  assert.equal(config.port, 5000);
  assert.ok(Object.isFrozen(config));
});

test("honours a custom PROMPTPAY_ID", () => {
  assert.equal(loadConfig({ ...baseEnv, PROMPTPAY_ID: "0812345678" }).promptPayId, "0812345678");
});

test("rejects short or placeholder JWT secrets", () => {
  assert.throws(() => loadConfig({ ...baseEnv, JWT_SECRET: "short" }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ ...baseEnv, JWT_SECRET: "replace_with_a_long_secret_value" }), /JWT_SECRET/);
});

test("rejects production without Stripe", () => {
  assert.throws(() => loadConfig({ ...baseEnv, NODE_ENV: "production" }), /Production requires/);
});

test("requires Stripe secrets when Stripe is selected", () => {
  assert.throws(() => loadConfig({ ...baseEnv, PAYMENT_PROVIDER: "stripe" }), /STRIPE_SECRET_KEY/);
});

test("rejects an invalid PROMPTPAY_ID", () => {
  assert.throws(() => loadConfig({ ...baseEnv, PROMPTPAY_ID: "123" }), /PROMPTPAY_ID/);
});

test("rejects an invalid port", () => {
  assert.throws(() => loadConfig({ ...baseEnv, PORT: "70000" }), /PORT/);
});

test("allows both loopback dev origins when FRONTEND_URL sets only one", () => {
  const config = loadConfig({ ...baseEnv, FRONTEND_URL: "http://localhost:5173" });
  assert.ok(config.frontendOrigins.includes("http://localhost:5173"));
  assert.ok(config.frontendOrigins.includes("http://127.0.0.1:5173"));
});

test("keeps only configured origins in production", () => {
  const config = loadConfig({
    ...baseEnv,
    NODE_ENV: "production",
    PAYMENT_PROVIDER: "stripe",
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    FRONTEND_URL: "https://app.example.com",
  });
  assert.deepEqual(config.frontendOrigins, ["https://app.example.com"]);
});
