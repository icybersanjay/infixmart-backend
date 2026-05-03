import { NextResponse } from "next/server";
import { checkDoubleSubmitCsrf } from "./lib/server/auth/csrf.js";
import {
  getRateLimitConfig,
  isOriginAllowed,
  isProduction,
  normalizeOrigin,
} from "./lib/server/config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const STATE_CHANGING_GET_PATHS = new Set([
  "/api/user/logout",
  "/api/admin/test-email",
]);
// Server-to-server endpoints called by external providers (no browser origin).
const PROVIDER_WEBHOOK_PATHS = new Set(["/api/payment/webhook"]);
const rateLimitStore =
  globalThis.__infixmartRateLimitStore ||
  (globalThis.__infixmartRateLimitStore = new Map());

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function getCorsHeaders(origin) {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  headers.set(
    "Access-Control-Allow-Methods",
    "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-CSRF-Token"
  );
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  if (isProduction) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  if (origin && isOriginAllowed(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function getTrustedOrigin(request) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) {
    return origin;
  }

  return normalizeOrigin(request.headers.get("referer"));
}

function isSensitiveApiPath(pathname) {
  return (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/user/") ||
    pathname.startsWith("/api/cart/") ||
    pathname === "/api/cart" ||
    pathname.startsWith("/api/mylist/") ||
    pathname === "/api/mylist" ||
    pathname.startsWith("/api/order/") ||
    pathname === "/api/order" ||
    pathname.startsWith("/api/payment/") ||
    pathname.startsWith("/api/returns/")
  );
}

function requiresOriginValidation(pathname, method) {
  return !SAFE_METHODS.has(method) || STATE_CHANGING_GET_PATHS.has(pathname);
}

function resolvePolicy(pathname, method) {
  const limits = getRateLimitConfig();

  if (!limits.enabled || SAFE_METHODS.has(method)) {
    return null;
  }

  if (
    pathname === "/api/admin/login" ||
    pathname === "/api/user/login" ||
    pathname === "/api/user/register" ||
    pathname === "/api/user/forgot-password" ||
    pathname === "/api/user/verifyemail" ||
    pathname === "/api/user/verify-forgot-password-otp" ||
    pathname === "/api/user/resend-otp"
  ) {
    return { name: "auth", windowMs: limits.authWindowMs, max: limits.authMax };
  }

  if (pathname.startsWith("/api/payment/")) {
    return {
      name: "payment",
      windowMs: limits.paymentWindowMs,
      max: limits.paymentMax,
    };
  }

  if (
    pathname.includes("/upload") ||
    pathname.includes("/upload-images") ||
    pathname === "/api/user/user-avatar"
  ) {
    return {
      name: "upload",
      windowMs: limits.uploadWindowMs,
      max: limits.uploadMax,
    };
  }

  if (pathname.startsWith("/api/admin/")) {
    return {
      name: "admin",
      windowMs: limits.adminWindowMs,
      max: limits.adminMax,
    };
  }

  return {
    name: "mutation",
    windowMs: limits.mutationWindowMs,
    max: limits.mutationMax,
  };
}

function checkRateLimit(key, policy) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + policy.windowMs };
    rateLimitStore.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(0, policy.max - next.count),
      resetAt: next.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: existing.count <= policy.max,
    remaining: Math.max(0, policy.max - existing.count),
    resetAt: existing.resetAt,
  };
}

function withHeaders(response, headers, pathname, rateLimitMeta = null, requestId = null) {
  headers.forEach((value, key) => response.headers.set(key, value));

  if (isSensitiveApiPath(pathname)) {
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    response.headers.set("Pragma", "no-cache");
  }

  if (rateLimitMeta) {
    response.headers.set("X-RateLimit-Limit", String(rateLimitMeta.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitMeta.remaining));
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rateLimitMeta.resetAt / 1000))
    );
  }

  if (requestId) {
    response.headers.set("X-Request-Id", requestId);
  }

  return response;
}

function getOrCreateRequestId(request) {
  const incoming = request.headers.get("x-request-id");
  if (incoming && /^[\w-]{6,128}$/.test(incoming)) return incoming;
  // Edge runtime: crypto.randomUUID is available globally.
  return crypto.randomUUID();
}

function nextWithRequestId(request, requestId) {
  // Propagate the id to downstream route handlers via a mutated request header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const origin = normalizeOrigin(request.headers.get("origin"));
  const requestOrigin = getTrustedOrigin(request);
  const headers = getCorsHeaders(origin);
  const requestId = getOrCreateRequestId(request);

  // Provider-to-server webhooks: skip browser-CSRF protections and rate-limit.
  if (PROVIDER_WEBHOOK_PATHS.has(pathname)) {
    return withHeaders(nextWithRequestId(request, requestId), headers, pathname, null, requestId);
  }

  if (request.method === "OPTIONS") {
    if (origin && !isOriginAllowed(origin)) {
      return withHeaders(
        NextResponse.json(
          { message: "Origin not allowed", error: true, success: false },
          { status: 403 }
        ),
        headers,
        pathname,
        null,
        requestId
      );
    }

    return withHeaders(new NextResponse(null, { status: 204 }), headers, pathname, null, requestId);
  }

  if (requiresOriginValidation(pathname, request.method)) {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") {
      return withHeaders(
        NextResponse.json(
          { message: "Cross-site request blocked", error: true, success: false },
          { status: 403 }
        ),
        headers,
        pathname,
        null,
        requestId
      );
    }

    if (requestOrigin && !isOriginAllowed(requestOrigin)) {
      return withHeaders(
        NextResponse.json(
          { message: "Origin not allowed", error: true, success: false },
          { status: 403 }
        ),
        headers,
        pathname,
        null,
        requestId
      );
    }

    // Double-submit CSRF: opt-in defense-in-depth on top of the origin checks
    // above. If the client sends an X-CSRF-Token header AND a csrf-token cookie,
    // they must match. Requests that send neither are admitted (older clients).
    const csrfStatus = checkDoubleSubmitCsrf(request);
    if (csrfStatus === "fail") {
      return withHeaders(
        NextResponse.json(
          { message: "CSRF token mismatch", error: true, success: false },
          { status: 403 }
        ),
        headers,
        pathname,
        null,
        requestId
      );
    }
  }

  if (!SAFE_METHODS.has(request.method) && origin && !isOriginAllowed(origin)) {
    return withHeaders(
      NextResponse.json(
        { message: "Origin not allowed", error: true, success: false },
        { status: 403 }
      ),
      headers,
      pathname,
      null,
      requestId
    );
  }

  const policy = resolvePolicy(pathname, request.method);
  if (policy) {
    const ip = getClientIp(request);
    const rateResult = checkRateLimit(`${policy.name}:${ip}`, policy);

    if (!rateResult.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rateResult.resetAt - Date.now()) / 1000)
      );
      const response = NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          error: true,
          success: false,
        },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(retryAfter));
      return withHeaders(
        response,
        headers,
        pathname,
        {
          limit: policy.max,
          remaining: 0,
          resetAt: rateResult.resetAt,
        },
        requestId
      );
    }

    return withHeaders(nextWithRequestId(request, requestId), headers, pathname, {
      limit: policy.max,
      remaining: rateResult.remaining,
      resetAt: rateResult.resetAt,
    }, requestId);
  }

  return withHeaders(nextWithRequestId(request, requestId), headers, pathname, null, requestId);
}

export const config = {
  matcher: ["/api/:path*"],
};
