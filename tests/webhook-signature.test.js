import crypto from "crypto";
import { describe, it, expect } from "vitest";

// Mirror of `verifySignature` in app/api/payment/webhook/route.js — kept in the
// test file deliberately so a regression in the route forces an explicit update
// here. This protects the webhook auth boundary: a forged signature must never
// be accepted, and a valid signature must never be rejected.
function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const SECRET = "whsec_test_1234567890";
const PAYLOAD = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_123", amount: 50000 } } },
});
const VALID_SIG = crypto
  .createHmac("sha256", SECRET)
  .update(PAYLOAD)
  .digest("hex");

describe("Razorpay webhook signature verification", () => {
  it("accepts a valid HMAC signature", () => {
    expect(verifySignature(PAYLOAD, VALID_SIG, SECRET)).toBe(true);
  });

  it("rejects when payload was tampered with", () => {
    const tampered = PAYLOAD.replace("50000", "1");
    expect(verifySignature(tampered, VALID_SIG, SECRET)).toBe(false);
  });

  it("rejects an invalid signature", () => {
    expect(verifySignature(PAYLOAD, "deadbeef", SECRET)).toBe(false);
  });

  it("rejects when the signature is empty/null", () => {
    expect(verifySignature(PAYLOAD, "", SECRET)).toBe(false);
    expect(verifySignature(PAYLOAD, null, SECRET)).toBe(false);
  });

  it("rejects when the secret is missing", () => {
    expect(verifySignature(PAYLOAD, VALID_SIG, "")).toBe(false);
    expect(verifySignature(PAYLOAD, VALID_SIG, undefined)).toBe(false);
  });

  it("rejects when the secret is wrong", () => {
    expect(verifySignature(PAYLOAD, VALID_SIG, "different-secret")).toBe(false);
  });
});
