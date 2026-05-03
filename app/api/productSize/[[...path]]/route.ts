import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { addOption, getOptions, removeOption } from "../../../../lib/server/services/option-lists.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params?: Promise<{ path?: string[] }> };

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function handle(request: NextRequest, context: RouteContext) {
  const params = context?.params ? await context.params : {};
  const segments = Array.isArray(params.path) ? params.path : [];

  try {
    const [first] = segments;

    if (request.method === "GET" && segments.length === 0) {
      return ok(await getOptions("size"));
    }

    if (request.method === "POST" && first === "create") {
      return ok(await addOption("size", await parseJson(request)), 201);
    }

    if (request.method === "DELETE" && first) {
      return ok(await removeOption("size", Number(first)));
    }

    return ok({ message: "Not found", error: true, success: false }, 404);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
