import type { Id, Product } from "../types.js";
import { log } from "../logger.js";

// Thin Meilisearch client — uses fetch instead of pulling in the official
// `meilisearch` npm package. The REST surface we need is small (search,
// add-or-update document, delete document, manage settings) and avoiding the
// dep keeps the runtime lean and the `serverExternalPackages` list stable.

const MEILI_HOST = (process.env.MEILI_HOST || "").replace(/\/+$/, "");
const MEILI_API_KEY = process.env.MEILI_API_KEY || "";
const PRODUCT_INDEX = process.env.MEILI_PRODUCT_INDEX || "products";

// Searchable + filterable attribute config. Order in `searchableAttributes`
// is the relevance order — `name` first means a query that matches the name
// outranks a description-only match.
const SEARCHABLE_ATTRIBUTES = ["name", "brand", "sku", "description"];
const FILTERABLE_ATTRIBUTES = ["status", "catId", "subCatId", "thirdSubCatId", "brand", "isFeatured", "discount", "price", "rating", "countInStock"];
const SORTABLE_ATTRIBUTES = ["price", "rating", "viewCount", "purchaseCount", "createdAt"];

export function isMeilisearchEnabled(): boolean {
  return Boolean(MEILI_HOST);
}

interface MeiliRequestInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  // For task-issuing endpoints, set true so we don't await Meili's task queue.
  // We never need synchronous indexing — search reads via MySQL by id afterwards.
  fireAndForget?: boolean;
}

async function meiliFetch<T>(path: string, init: MeiliRequestInit = {}): Promise<T | null> {
  if (!isMeilisearchEnabled()) return null;
  const url = `${MEILI_HOST}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (MEILI_API_KEY) headers.Authorization = `Bearer ${MEILI_API_KEY}`;

  try {
    const res = await fetch(url, {
      method: init.method || "GET",
      headers,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      log.warn(
        { url, status: res.status, body: text.slice(0, 200) },
        "meilisearch_request_failed"
      );
      return null;
    }
    if (init.fireAndForget) return null;
    return (await res.json()) as T;
  } catch (err) {
    log.warn(
      { url, err: { message: err instanceof Error ? err.message : String(err) } },
      "meilisearch_network_error"
    );
    return null;
  }
}

/**
 * Idempotent index bootstrap. Creates the index if missing and ensures the
 * searchable/filterable/sortable attributes are configured. Safe to call on
 * every server start.
 */
export async function ensureProductIndex(): Promise<void> {
  if (!isMeilisearchEnabled()) return;

  // Create the index if missing — Meili returns 202 + a task id whether the
  // index existed or not, so just fire and ignore.
  await meiliFetch(`/indexes`, {
    method: "POST",
    body: { uid: PRODUCT_INDEX, primaryKey: "id" },
    fireAndForget: true,
  });

  // Update settings — also idempotent on the Meili side.
  await meiliFetch(`/indexes/${PRODUCT_INDEX}/settings`, {
    method: "PATCH",
    body: {
      searchableAttributes: SEARCHABLE_ATTRIBUTES,
      filterableAttributes: FILTERABLE_ATTRIBUTES,
      sortableAttributes: SORTABLE_ATTRIBUTES,
      // Stopwords + ranking left at Meili defaults — the defaults are sane for
      // English/Hindi mixed catalog text. Tune later if a query falls flat.
    },
    fireAndForget: true,
  });
}

/**
 * Project a Product down to the minimal doc Meilisearch needs to do search +
 * filtering. We don't store images/legacy variant arrays — those come back from
 * MySQL on the second hop after the search returns ids.
 */
function toIndexDoc(product: Product): Record<string, unknown> {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: stripHtml(product.description || "").slice(0, 2000),
    brand: product.brand,
    catId: product.catId,
    subCatId: product.subCatId,
    thirdSubCatId: product.thirdSubCatId,
    status: product.status,
    price: Number(product.price || 0),
    rating: Number(product.rating || 0),
    discount: Number(product.discount || 0),
    countInStock: Number(product.countInStock || 0),
    isFeatured: Boolean(product.isFeatured) ? 1 : 0,
    viewCount: Number(product.viewCount || 0),
    purchaseCount: Number(product.purchaseCount || 0),
    createdAt: typeof product.createdAt === "string"
      ? Date.parse(product.createdAt) || 0
      : (product.createdAt as Date)?.getTime?.() || 0,
  };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Upsert one product document. Fire-and-forget by design — a failed sync
 * shouldn't block the write that triggered it. The reindex script is the
 * recovery path for missed updates.
 */
export async function indexProduct(product: Product): Promise<void> {
  if (!isMeilisearchEnabled()) return;
  await meiliFetch(`/indexes/${PRODUCT_INDEX}/documents`, {
    method: "POST",
    body: [toIndexDoc(product)],
    fireAndForget: true,
  });
}

export async function unindexProduct(productId: Id): Promise<void> {
  if (!isMeilisearchEnabled()) return;
  await meiliFetch(`/indexes/${PRODUCT_INDEX}/documents/${productId}`, {
    method: "DELETE",
    fireAndForget: true,
  });
}

export async function bulkIndexProducts(products: Product[]): Promise<void> {
  if (!isMeilisearchEnabled() || products.length === 0) return;
  await ensureProductIndex();
  await meiliFetch(`/indexes/${PRODUCT_INDEX}/documents`, {
    method: "POST",
    body: products.map(toIndexDoc),
    fireAndForget: true,
  });
}

export interface MeiliSearchOptions {
  page?: number;
  perPage?: number;
  category?: string | number;
  subCategory?: string | number;
  thirdCategory?: string | number;
  brand?: string;
  minRating?: string | number;
  exactRating?: string | number;
  inStockOnly?: string;
  onSale?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  sort?: string;
  status?: string;
  includeAllStatuses?: boolean;
}

export interface MeiliSearchHit {
  id: Id;
}

export interface MeiliSearchResult {
  ids: Id[];
  totalHits: number;
}

interface MeiliSearchResponse {
  hits?: MeiliSearchHit[];
  estimatedTotalHits?: number;
  totalHits?: number;
}

function buildFilter(opts: MeiliSearchOptions): string | undefined {
  const parts: string[] = [];

  if (!opts.includeAllStatuses) {
    parts.push(`status = "${opts.status || "active"}"`);
  }
  if (opts.category) parts.push(`catId = ${Number(opts.category)}`);
  if (opts.subCategory) parts.push(`subCatId = ${Number(opts.subCategory)}`);
  if (opts.thirdCategory) parts.push(`thirdSubCatId = ${Number(opts.thirdCategory)}`);
  if (opts.brand) parts.push(`brand = "${escapeFilterString(opts.brand)}"`);
  if (opts.minRating) parts.push(`rating >= ${Number(opts.minRating)}`);
  if (opts.exactRating !== undefined && opts.exactRating !== "") {
    parts.push(`rating = ${Number(opts.exactRating)}`);
  }
  if (opts.inStockOnly === "true") parts.push(`countInStock > 0`);
  if (opts.onSale === "true") parts.push(`discount > 0`);
  if (opts.minPrice !== "" && opts.minPrice !== undefined && opts.maxPrice !== "" && opts.maxPrice !== undefined) {
    parts.push(`price ${Number(opts.minPrice)} TO ${Number(opts.maxPrice)}`);
  } else if (opts.minPrice !== "" && opts.minPrice !== undefined) {
    parts.push(`price >= ${Number(opts.minPrice)}`);
  } else if (opts.maxPrice !== "" && opts.maxPrice !== undefined) {
    parts.push(`price <= ${Number(opts.maxPrice)}`);
  }

  return parts.length ? parts.join(" AND ") : undefined;
}

function escapeFilterString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSort(sort: string | undefined): string[] | undefined {
  switch (sort) {
    case "price-asc":     return ["price:asc"];
    case "price-desc":    return ["price:desc"];
    case "rating-desc":   return ["rating:desc"];
    case "name-asc":      return undefined; // Meili text sort isn't great; leave to default relevance
    case "trending":      return ["viewCount:desc", "rating:desc"];
    case "popular":       return ["purchaseCount:desc", "viewCount:desc"];
    case "best-seller":
    case "bestseller":    return ["purchaseCount:desc"];
    default:              return undefined; // Meili default = relevance, then createdAt
  }
}

export interface MeiliFacetsResult {
  total: number;
  brands: { name: string; count: number }[];
  ratings: { minRating: number; count: number }[];
  prices: { range: [number, number | null]; label: string; count: number }[];
}

interface MeiliFacetSearchResponse {
  estimatedTotalHits?: number;
  totalHits?: number;
  facetDistribution?: Record<string, Record<string, number>>;
}

const PRICE_BUCKETS: { range: [number, number | null]; label: string; filter: string }[] = [
  { range: [0, 499],     label: "Under ₹500",      filter: "price < 500" },
  { range: [500, 999],   label: "₹500 – ₹999",     filter: "price 500 TO 999" },
  { range: [1000, 2499], label: "₹1,000 – ₹2,499", filter: "price 1000 TO 2499" },
  { range: [2500, 4999], label: "₹2,500 – ₹4,999", filter: "price 2500 TO 4999" },
  { range: [5000, null], label: "₹5,000 & above",  filter: "price >= 5000" },
];

/**
 * Per-facet counts for a search query. Brand + rating buckets come from Meili's
 * native `facetDistribution`. Price buckets need separate count-only requests
 * because Meili returns distinct price values (too granular for bucket counts);
 * we fan out one count-only search per bucket in parallel.
 *
 * Returns `null` when Meili is unavailable so the caller can fall back to the
 * existing MySQL `listProductFacets` path.
 */
export async function searchProductFacets(
  query: string,
  opts: MeiliSearchOptions = {}
): Promise<MeiliFacetsResult | null> {
  if (!isMeilisearchEnabled()) return null;
  const baseFilter = buildFilter({
    ...opts,
    // Brand filter is excluded so brand counts can show "switch to brand X".
    // Same trick the MySQL path uses.
    brand: undefined,
  });

  // Main facet pull: brand + rating distribution + total. Excludes the active
  // brand filter (so the user can pick another brand) — same expand-on-self
  // pattern the MySQL path uses.
  const mainBody: Record<string, unknown> = {
    q: query || "",
    limit: 0,
    facets: ["brand", "rating"],
  };
  if (baseFilter) mainBody.filter = baseFilter;

  // Price bucket counts: one count-only search per bucket. Each bucket excludes
  // the active price filter so the user can widen the range.
  const priceBaseFilter = buildFilter({ ...opts, brand: opts.brand, minPrice: undefined, maxPrice: undefined });
  const priceCalls = PRICE_BUCKETS.map(async (bucket) => {
    const filterParts = [bucket.filter];
    if (priceBaseFilter) filterParts.push(`(${priceBaseFilter})`);
    const res = await meiliFetch<MeiliFacetSearchResponse>(
      `/indexes/${PRODUCT_INDEX}/search`,
      {
        method: "POST",
        body: { q: query || "", limit: 0, filter: filterParts.join(" AND ") },
      }
    );
    return Number(res?.totalHits ?? res?.estimatedTotalHits ?? 0);
  });

  const [main, priceCounts] = await Promise.all([
    meiliFetch<MeiliFacetSearchResponse>(`/indexes/${PRODUCT_INDEX}/search`, {
      method: "POST",
      body: mainBody,
    }),
    Promise.all(priceCalls),
  ]);

  if (!main) return null;

  const brandDist = main.facetDistribution?.brand || {};
  const ratingDist = main.facetDistribution?.rating || {};

  const brands = Object.entries(brandDist)
    .filter(([name]) => name && name !== "null")
    .map(([name, count]) => ({ name, count: Number(count || 0) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 50);

  // Bucket distinct rating values (Meili returns each distinct float) into
  // integer floor buckets so the response shape matches MySQL's FLOOR(rating).
  const ratingBuckets = new Map<number, number>();
  for (const [rawRating, count] of Object.entries(ratingDist)) {
    const bucket = Math.floor(Number(rawRating || 0));
    ratingBuckets.set(bucket, (ratingBuckets.get(bucket) || 0) + Number(count || 0));
  }
  const ratings = [...ratingBuckets.entries()]
    .map(([bucket, count]) => ({ minRating: bucket, count }))
    .sort((a, b) => b.minRating - a.minRating);

  return {
    total: Number(main.totalHits ?? main.estimatedTotalHits ?? 0),
    brands,
    ratings,
    prices: PRICE_BUCKETS.map((b, i) => ({
      range: b.range,
      label: b.label,
      count: priceCounts[i] ?? 0,
    })),
  };
}

/**
 * Search by text query. Returns the matching product IDs in relevance order
 * plus a total-hit count. Caller is expected to fetch full product rows from
 * MySQL by id (so the source-of-truth stays MySQL — Meili is a search-only
 * cache that may briefly be stale).
 *
 * Returns `null` when Meilisearch is not configured OR the request fails.
 * Caller should fall back to MySQL FULLTEXT in that case.
 */
export async function searchProductIds(
  query: string,
  opts: MeiliSearchOptions = {}
): Promise<MeiliSearchResult | null> {
  if (!isMeilisearchEnabled()) return null;
  const page = Math.max(1, Number(opts.page || 1));
  const perPage = Math.max(1, Number(opts.perPage || 10));
  const offset = (page - 1) * perPage;

  const body: Record<string, unknown> = {
    q: query,
    limit: perPage,
    offset,
    attributesToRetrieve: ["id"],
  };
  const filter = buildFilter(opts);
  if (filter) body.filter = filter;
  const sort = buildSort(opts.sort);
  if (sort) body.sort = sort;

  const res = await meiliFetch<MeiliSearchResponse>(
    `/indexes/${PRODUCT_INDEX}/search`,
    { method: "POST", body }
  );
  if (!res || !Array.isArray(res.hits)) return null;

  return {
    ids: res.hits.map((h) => Number(h.id)).filter((n) => Number.isInteger(n) && n > 0),
    totalHits: Number(res.totalHits ?? res.estimatedTotalHits ?? res.hits.length),
  };
}
