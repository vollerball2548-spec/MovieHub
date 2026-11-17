/**
 * PromptPay / EMVCo QR payload builder.
 *
 * Produces the ASCII payload that banking apps encode into a QR code. The
 * payload carries the PromptPay recipient and, when an amount is supplied, the
 * exact amount due (dynamic QR, point-of-initiation method "12").
 *
 * Reference: EMVCo QR Code Specification for Payment Systems (Merchant
 * Presented Mode) and the PromptPay merchant account AID A000000677010111.
 */

export const PROMPTPAY_AID = "A000000677010111";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Detects a genuine PNG or JPEG image from its magic bytes. Returns the
 * normalized MIME type, or null when the bytes are neither format.
 */
export function detectImageType(bytes) {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

/** EMVCo TLV tag: 2-digit id + 2-digit length + value. */
function tag(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

/**
 * CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection) as required by
 * EMVCo tag 63. Returns 4 uppercase hex characters.
 */
export function crc16ccitt(input) {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Accepts common Thai PromptPay identifiers and returns the EMVCo sub-tag type
 * and value: mobile ("01"), national/tax ID ("02"), or e-wallet ("03").
 */
export function normalizePromptPayId(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return { type: "mobile", value: `0066${digits.slice(1)}` };
  if (/^66\d{9}$/.test(digits)) return { type: "mobile", value: `00${digits}` };
  if (/^0066\d{9}$/.test(digits)) return { type: "mobile", value: digits };
  if (/^\d{13}$/.test(digits)) return { type: "nationalId", value: digits };
  if (/^\d{15}$/.test(digits)) return { type: "ewallet", value: digits };
  throw new Error("PromptPay ID must be a 10-digit mobile number, a 13-digit national/tax ID, or a 15-digit e-wallet ID");
}

function formatAmount(amount) {
  if (amount === undefined || amount === null || amount === "") return "";
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("PromptPay amount must be a positive number");
  if (value > 99_999_999_999.99) throw new Error("PromptPay amount is too large");
  return value.toFixed(2);
}

/**
 * Build the PromptPay payload string.
 *
 * @param {object} options
 * @param {string} options.promptPayId Phone number, national ID, or e-wallet ID.
 * @param {number|string} [options.amount] Amount due. Omit for a static QR.
 * @param {string} [options.currency] Reserved; PromptPay is THB-only.
 * @returns {string} EMVCo payload ready for QR encoding.
 */
export function buildPromptPayPayload({ promptPayId, amount, currency = "THB" }) {
  if (currency !== "THB") throw new Error("PromptPay only supports THB");
  const merchant = normalizePromptPayId(promptPayId);
  const amountValue = formatAmount(amount);

  const merchantField = tag(
    "29",
    tag("00", PROMPTPAY_AID) +
      (merchant.type === "mobile"
        ? tag("01", merchant.value)
        : merchant.type === "nationalId"
          ? tag("02", merchant.value)
          : tag("03", merchant.value))
  );

  const body =
    tag("00", "01") +
    tag("01", amountValue ? "12" : "11") +
    merchantField +
    tag("53", "764") +
    (amountValue ? tag("54", amountValue) : "") +
    tag("58", "TH");

  const payloadWithCrcTag = `${body}6304`;
  return `${payloadWithCrcTag}${crc16ccitt(payloadWithCrcTag)}`;
}
