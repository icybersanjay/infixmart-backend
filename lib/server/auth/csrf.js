import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;
// 12 hours — longer-lived than session cookies because rotation isn't needed
// for the double-submit pattern (the secret is the random value itself).
const TOKEN_TTL_SEC = 60 * 60 * 12;

function generateCsrfToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function constantTimeEquals(a, b) {
  const aBuf = Buffer.from(String(a || ""));
  const bBuf = Buffer.from(String(b || ""));
  if (aBuf.length === 0 || bBuf.length === 0) return false;
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies a double-submit-cookie CSRF pair when the client opts in via header.
 *
 * Returns:
 *   - "missing" if no X-CSRF-Token header was sent (legacy client, skip).
 *   - "ok"      if header is present and matches the cookie.
 *   - "fail"    if header is present but the cookie is missing or mismatched.
 *
 * The opt-in semantics mean: existing clients that don't send the header keep
 * working (they're still protected by the origin / sec-fetch-site checks
 * applied earlier in the middleware). Once the frontend starts including the
 * X-CSRF-Token header, we strictly verify the double-submit pair.
 */
function checkDoubleSubmitCsrf(request) {
  const header = request.headers.get(CSRF_HEADER_NAME);
  if (!header) return "missing";

  const cookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookie) return "fail";

  return constantTimeEquals(cookie, header) ? "ok" : "fail";
}

export {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  TOKEN_TTL_SEC,
  checkDoubleSubmitCsrf,
  constantTimeEquals,
  generateCsrfToken,
};
