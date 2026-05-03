// Lightweight typeahead endpoint for the header search dropdown.
//
// Why a dedicated route instead of `/api/product?search=...`:
//  - Slim projection (id, name, slug, price, oldprice, single image, brand) —
//    typically 1/5 the payload size of the full product list response.
//  - Single round-trip: includes a "did you mean" fallback (the dropdown UI
//    used to fire two requests when the first returned 0 hits).
//  - Reuses `getAllProducts` so it gets Meili routing for free when MEILI_HOST
//    is configured; falls through to MySQL FULLTEXT otherwise.
//  - Returns its own narrow shape so future callers (header, mobile sheet)
//    don't need to know the heavyweight product-list shape.
import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "../../../../lib/server/api/http.js";
import { getAllProducts } from "../../../../lib/server/services/products.js";
import { logSearchQuery } from "../../../../lib/server/repositories/search-logs.js";
import { requireAccessUserId } from "../../../../lib/server/auth/session.js";
import type { Id } from "../../../../lib/server/types.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 10;
const FALLBACK_LIMIT = 4;

interface SuggestProduct {
  id: Id;
  name: string;
  slug: string | null;
  price: number;
  oldprice: number;
  image: string | null;
  brand: string | null;
}

interface SuggestResponse {
  query: string;
  products: SuggestProduct[];
  didYouMean: string[];
  searchEngine: "meilisearch" | "mysql";
}

function tryGetUserId(request: NextRequest): Id | null {
  try {
    return requireAccessUserId(request);
  } catch {
    return null;
  }
}

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
}

function pickImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  return typeof first === "string" && first.length > 0 ? first : null;
}

function project(rows: unknown): SuggestProduct[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((p) => {
    const r = p as {
      id: Id;
      name: string;
      slug?: string | null;
      price: number | string;
      oldprice?: number | string | null;
      images?: unknown;
      brand?: string | null;
    };
    return {
      id: r.id,
      name: r.name,
      slug: r.slug || null,
      price: Number(r.price) || 0,
      oldprice: Number(r.oldprice) || 0,
      image: pickImage(r.images),
      brand: r.brand || null,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit") || 6)));

    // Empty query → empty payload, not 400 (the dropdown calls this on focus
    // before the user has typed anything).
    if (!q) {
      const empty: SuggestResponse = {
        query: "",
        products: [],
        didYouMean: [],
        searchEngine: "mysql",
      };
      return ok(empty);
    }

    const result = await getAllProducts({
      page: 1,
      perPage: limit,
      search: q,
      // Public-facing — only show active products in suggestions.
      status: "active",
    });

    const products = project(result.products);
    let didYouMean: string[] = [];

    // No hits — try a broader query (drop the last token, or trim a char) so
    // the user gets a hint instead of a dead end. One extra DB hit only fires
    // when there are zero results, so it's cheap on the happy path.
    if (products.length === 0) {
      const tokens = q.split(/\s+/).filter(Boolean);
      const broader =
        tokens.length > 1
          ? tokens.slice(0, -1).join(" ")
          : q.length > 3
            ? q.slice(0, q.length - 1)
            : q;
      if (broader && broader !== q) {
        const fb = await getAllProducts({
          page: 1,
          perPage: FALLBACK_LIMIT,
          search: broader,
          status: "active",
        });
        didYouMean = (fb.products || [])
          .map((p) => (p as { name?: string }).name)
          .filter((n): n is string => Boolean(n))
          .slice(0, 3);
      }
    }

    // Best-effort search log so admins see what people are typing — never
    // block the response on it.
    logSearchQuery({
      query: q,
      resultCount: products.length,
      userId: tryGetUserId(request),
      ip: getClientIp(request),
    }).catch(() => null);

    const payload: SuggestResponse = {
      query: q,
      products,
      didYouMean,
      // Forwarded from the underlying service when Meili was used. Helps the
      // client UI optionally show a "powered by Meilisearch" badge.
      searchEngine:
        (result as { searchEngine?: "meilisearch" }).searchEngine === "meilisearch"
          ? "meilisearch"
          : "mysql",
    };

    return ok(payload);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
