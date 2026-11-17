import test from "node:test";
import assert from "node:assert/strict";
import { buildPromptPayPayload, crc16ccitt, detectImageType, normalizePromptPayId } from "../modules/payment/promptpay.js";

test("CRC-16/CCITT-FALSE matches the standard check value", () => {
  assert.equal(crc16ccitt("123456789"), "29B1");
});

test("normalizes Thai mobile numbers in common formats", () => {
  assert.deepEqual(normalizePromptPayId("0860068644"), { type: "mobile", value: "0066860068644" });
  assert.deepEqual(normalizePromptPayId("+66 86 006 8644"), { type: "mobile", value: "0066860068644" });
  assert.deepEqual(normalizePromptPayId("0066860068644"), { type: "mobile", value: "0066860068644" });
});

test("accepts national and e-wallet IDs", () => {
  assert.equal(normalizePromptPayId("1234567890123").type, "nationalId");
  assert.equal(normalizePromptPayId("012345678901234").type, "ewallet");
});

test("rejects an invalid PromptPay ID", () => {
  assert.throws(() => normalizePromptPayId("123"), /PromptPay ID/);
});

test("builds a dynamic payload carrying the amount due", () => {
  const payload = buildPromptPayPayload({ promptPayId: "0860068644", amount: 50 });
  assert.match(payload, /^000201/);
  assert.match(payload, /010212/); // dynamic QR: amount present
  assert.match(payload, /29370016A00000067701011101130066860068644/);
  assert.match(payload, /5303764/); // transaction currency THB
  assert.match(payload, /540550\.00/); // amount 50.00
  assert.match(payload, /5802TH/);
  assert.equal(payload.slice(-4), crc16ccitt(payload.slice(0, -4)));
});

test("builds a static payload when no amount is supplied", () => {
  const payload = buildPromptPayPayload({ promptPayId: "0860068644" });
  assert.match(payload, /010211/);
  assert.match(payload, /53037645802TH/); // no amount field between currency and country
});

test("formats amounts to two decimals", () => {
  const payload = buildPromptPayPayload({ promptPayId: "0860068644", amount: "50.5" });
  assert.match(payload, /540550\.50/);
});

test("rejects non-positive amounts", () => {
  assert.throws(() => buildPromptPayPayload({ promptPayId: "0860068644", amount: 0 }), /positive/);
  assert.throws(() => buildPromptPayPayload({ promptPayId: "0860068644", amount: -10 }), /positive/);
});

test("detects genuine PNG and JPEG slips from their magic bytes", () => {
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(8)]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(8)]);
  assert.equal(detectImageType(png), "image/png");
  assert.equal(detectImageType(jpeg), "image/jpeg");
});

test("rejects non-image and truncated slip bytes", () => {
  assert.equal(detectImageType(Buffer.from("not an image at all")), null);
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8])), null);
  assert.equal(detectImageType(Buffer.from([137, 80, 78, 71])), null);
  assert.equal(detectImageType("string is not a buffer"), null);
});
