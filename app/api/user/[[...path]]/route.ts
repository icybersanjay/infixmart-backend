import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "../../../../lib/server/api/http.js";
import {
  clearAuthCookies,
  clearPasswordResetCookie,
  setAuthCookies,
  setPasswordResetCookie,
} from "../../../../lib/server/auth/cookies.js";
import {
  requireAccessUserId,
  requirePasswordResetEmail,
  requireRefreshToken,
  verifyRefreshTokenOrThrow,
} from "../../../../lib/server/auth/session.js";
import {
  forgotPassword,
  getUserDetails,
  googleLogin,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendVerificationOtp,
  resetPassword,
  deleteUserImageByQuery,
  updateUserDetails,
  uploadUserAvatar,
  verifyEmail,
  verifyForgotPasswordCode,
} from "../../../../lib/server/services/user-auth.js";
import {
  deleteOwnAccount,
  exportUserData,
} from "../../../../lib/server/services/user-data.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ path?: string[] }> };

const NATIVE_POST_ROUTES = new Set([
  "register",
  "verifyemail",
  "login",
  "logout",
  "google-login",
  "forgot-password",
  "verify-forgot-password-otp",
  "resend-otp",
  "reset-password",
  "refresh-token",
]);

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function dispatchNativeRoute(request: NextRequest, segments: string[]) {
  const [firstSegment] = segments;

  if (request.method === "POST" && firstSegment === "register") {
    return ok(await registerUser(await parseJson(request)));
  }

  if (request.method === "POST" && firstSegment === "verifyemail") {
    return ok(await verifyEmail(await parseJson(request)));
  }

  if (request.method === "POST" && firstSegment === "login") {
    const result = await loginUser(await parseJson(request));
    const response = ok(result.body);
    setAuthCookies(response, result.tokens);
    clearPasswordResetCookie(response);
    return response;
  }

  if (
    (request.method === "GET" || request.method === "POST") &&
    firstSegment === "logout"
  ) {
    const userId = requireAccessUserId(request);
    const response = ok(await logoutUser(userId));
    clearAuthCookies(response);
    clearPasswordResetCookie(response);
    return response;
  }

  if (request.method === "GET" && firstSegment === "user-details") {
    return ok(await getUserDetails(requireAccessUserId(request)));
  }

  if (
    request.method === "PUT" &&
    segments.length === 1 &&
    firstSegment !== "user-avatar"
  ) {
    const userId = requireAccessUserId(request);
    return ok(await updateUserDetails(userId, await parseJson(request)));
  }

  if (request.method === "POST" && firstSegment === "forgot-password") {
    const response = ok(await forgotPassword(await parseJson(request)));
    clearPasswordResetCookie(response);
    return response;
  }

  if (request.method === "POST" && firstSegment === "verify-forgot-password-otp") {
    const result = await verifyForgotPasswordCode(await parseJson(request));
    const response = ok(result.body);
    setPasswordResetCookie(response, result.passwordResetToken);
    return response;
  }

  if (request.method === "POST" && firstSegment === "resend-otp") {
    return ok(await resendVerificationOtp(await parseJson(request)));
  }

  if (request.method === "POST" && firstSegment === "reset-password") {
    const payload = await parseJson(request);
    if (!payload?.oldPassword) {
      requirePasswordResetEmail(request, payload?.email as string);
    }
    const response = ok(await resetPassword(payload));
    clearPasswordResetCookie(response);
    return response;
  }

  if (request.method === "POST" && firstSegment === "refresh-token") {
    const refreshToken = requireRefreshToken(request);
    verifyRefreshTokenOrThrow(refreshToken);
    const result = await refreshAccessToken(refreshToken);
    const response = ok(result.body);
    setAuthCookies(response, result.tokens);
    return response;
  }

  if (request.method === "POST" && firstSegment === "google-login") {
    const result = await googleLogin(await parseJson(request));
    const response = ok(result.body);
    setAuthCookies(response, result.tokens);
    clearPasswordResetCookie(response);
    return response;
  }

  if (request.method === "PUT" && firstSegment === "user-avatar") {
    return ok(await uploadUserAvatar(requireAccessUserId(request), request));
  }

  if (request.method === "DELETE" && firstSegment === "deleteimage") {
    requireAccessUserId(request);
    return ok(await deleteUserImageByQuery(request));
  }

  if (request.method === "GET" && firstSegment === "export-my-data") {
    const userId = requireAccessUserId(request);
    const data = await exportUserData(userId);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="infixmart-data-${userId}-${Date.now()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (request.method === "POST" && firstSegment === "delete-account") {
    const userId = requireAccessUserId(request);
    const body = await parseJson(request);
    const result = await deleteOwnAccount(userId, { password: body?.password as string });
    const response = ok(result);
    clearAuthCookies(response);
    clearPasswordResetCookie(response);
    return response;
  }

  return null;
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const nativeResponse = await dispatchNativeRoute(request, segments);
    if (nativeResponse) {
      return nativeResponse;
    }

    const isReservedNativeRoute =
      (request.method === "POST" && NATIVE_POST_ROUTES.has(segments[0])) ||
      (request.method === "GET" &&
        ["logout", "user-details"].includes(segments[0])) ||
      (request.method === "POST" && segments[0] === "logout") ||
      (request.method === "PUT" &&
        segments.length === 1 &&
        segments[0] !== "user-avatar");

    if (isReservedNativeRoute) {
      return fail(404, "Not found");
    }

    return fail(404, "Route not found");
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
