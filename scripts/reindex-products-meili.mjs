#!/usr/bin/env node
/**
 * Full reindex of `Products` into Meilisearch.
 *
 * Run after: standing up a fresh Meili instance, restoring from backup, OR
 * any catalog batch import that bypassed `services/products.js` (which has
 * the per-mutation incremental sync hooks).
 *
 * The reindex is page-based and idempotent — each batch upserts via the same
 * fire-and-forget POST that the live sync uses, so re-running is safe.
 *
 * Usage
 * ─────
 *   # Set MEILI_HOST + DB_* env vars first (same as the app)
 *   node --experimental-strip-types scripts/reindex-products-meili.mjs
 *
 *   # Drop + recreate the index before reindexing (clears stale docs)
 *   node --experimental-strip-types scripts/reindex-products-meili.mjs --reset
 *
 *   The flag is required because the script imports the .js repo shims, which
 *   re-export from .ts files.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "..", ".env.local") });
loadEnv({ path: resolve(here, "..", ".env") });

const RESET = process.argv.includes("--reset");

const { listProducts } = await import("../lib/server/repositories/products.js");
const { getMysqlPool } = await import("../lib/server/db/mysql.js");
const {
  bulkIndexProducts,
  ensureProductIndex,
  isMeilisearchEnabled,
} = await import("../lib/server/search/meilisearch.js");

if (!isMeilisearchEnabled()) {
  console.error("[reindex] MEILI_HOST is not set — nothing to do.");
  process.exit(1);
}

async function meiliRequest(path, init = {}) {
  const host = (process.env.MEILI_HOST || "").replace(/\/+$/, "");
  const apiKey = process.env.MEILI_API_KEY || "";
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${host}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return res;
}

async function main() {
  const indexUid = process.env.MEILI_PRODUCT_INDEX || "products";

  if (RESET) {
    console.log(`[reindex] dropping index "${indexUid}" first…`);
    const res = await meiliRequest(`/indexes/${indexUid}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      console.error(`[reindex] failed to drop index: HTTP ${res.status}`);
      process.exitCode = 1;
      return;
    }
    // Wait briefly for the async task to settle. The next bulk POST will
    // re-create the index, so a long wait isn't necessary.
    await new Promise((r) => setTimeout(r, 500));
  }

  await ensureProductIndex();

  const PAGE_SIZE = 500;
  let page = 1;
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { products, totalPages } = await listProducts({
      page,
      perPage: PAGE_SIZE,
      includeAllStatuses: true,
    });
    if (!products.length) break;

    await bulkIndexProducts(products);
    total += products.length;
    console.log(`[reindex] page ${page}/${totalPages} — ${products.length} docs (total ${total})`);

    if (page >= totalPages) break;
    page += 1;
  }

  console.log(`[reindex] done. ${total} products queued for indexing.`);
  console.log(`[reindex] Meili processes the queue asynchronously — check`);
  console.log(`           ${process.env.MEILI_HOST}/tasks for status.`);

  await getMysqlPool().end();
}

main().catch((err) => {
  console.error("[reindex] fatal:", err);
  process.exitCode = 1;
});
