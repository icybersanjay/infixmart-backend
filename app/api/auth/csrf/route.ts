import { type NextRequest, NextResponse } from "next/server";
import {
  CSRF_COOKIE_NAME,
  TOKEN_TTL_SEC,
  generateCsrfToken,
} from "../../../../lib/server/auth/csrf.js";
import { isProduction } from "../../../../lib/server/config/env.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const token = existing || generateCsrfToken();

  const response = NextResponse.json({
    success: true,
    error: false,
    csrfToken: token,
  });

  if (!existing) {
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_TTL_SEC,
    });
  }

  return response;
}
