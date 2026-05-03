import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import {
  addMyAddress,
  getMyAddresses,
} from "../../../../lib/server/services/addresses.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    return ok(await getMyAddresses(userId));
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    return ok(await addMyAddress(userId, await parseJson(request)), 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
