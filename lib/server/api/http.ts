import { NextResponse, type NextRequest } from "next/server";
import { log } from "../logger.js";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function json<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function ok<T>(data: T, status: number = 200): NextResponse {
  return json(data, status);
}

export function fail(status: number, message: string): NextResponse {
  return json({ message, error: true, success: false }, status);
}

type RequestLike =
  | NextRequest
  | (Request & { nextUrl?: { pathname?: string } })
  | null
  | undefined;

export function handleRouteError(error: unknown, request: RequestLike = null): NextResponse {
  const requestId = request?.headers?.get?.("x-request-id") || null;
  const route = (request as NextRequest | null)?.nextUrl?.pathname || null;
  const method = request?.method || null;

  if (error instanceof HttpError) {
    log.warn(
      { requestId, route, method, status: error.status, msg: error.message },
      "request_failed"
    );
    return fail(error.status, error.message);
  }

  const err = error as { name?: string; message?: string; stack?: string } | null;
  log.error(
    {
      requestId,
      route,
      method,
      status: 500,
      err: { name: err?.name, message: err?.message, stack: err?.stack },
    },
    "request_crashed"
  );
  return fail(500, "Internal server error");
}
