#!/usr/bin/env node
/**
 * Backfill the new ProductVariants table from the legacy JSON columns
 * (`Products.size`, `Products.productRam`, `Products.productWeight`).
 *
 * Strategy
 * ────────
 *   For every product, parse the three legacy arrays. If at least one is
 *   non-empty, take the cartesian product of the populated dimensions and
 *   emit one ProductVariant row per combination. Variant inherits the parent
 *   product's price and `countInStock` (split evenly with a floor of 0 if
 *   there are multiple combos — admin can re-balance later).
 *
 *   Variant SKU = `{parentSku}-{slug-of-attrs}`, falls back to NULL when the
 *   parent has no SKU. The unique index protects against re-runs (duplicate
 *   SKUs are skipped silently in `bulkCreateVariants`).
 *
 *   Products with all-empty variant arrays are skipped — they're sold as a
 *   single SKU and don't need a variant row.
 *
 * Usage
 * ─────
 *   # dry-run (default)
 *   node --experimental-strip-types scripts/backfill-product-variants.mjs
 *
 *   # actually insert
 *   node --experimental-strip-types scripts/backfill-product-variants.mjs --apply
 *
 *   The flag is required because the script imports the .js repo shims, which
 *   re-export from the new .ts files (Next handles this in the app build, but
 *   standalone scripts need Node's type-stripper). Node 22.6+ supports it.
 *
 *   Set DB_* env vars before running (same as the app — copies from .env / .env.local).
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config as loadEnv } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "..", ".env.local") });
loadEnv({ path: resolve(here, "..", ".env") });

const APPLY = process.argv.includes("--apply");

// Lazy import so env vars are loaded first (db pool reads them at module-init).
const { listProducts } = await import("../lib/server/repositories/products.js");
const { bulkCreateVariants, listVariantsByProductId } = await import(
  "../lib/server/repositories/product-variants.js"
);
const { getMysqlPool } = await import("../lib/server/db/mysql.js");

function safeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function variantsForProduct(product) {
  const sizes   = safeArray(product.size);
  const rams    = safeArray(product.productRam);
  const weights = safeArray(product.productWeight);

  const dims = [];
  if (sizes.length)   dims.push(["size", sizes]);
  if (rams.length)    dims.push(["ram",  rams]);
  if (weights.length) dims.push(["weight", weights]);
  if (!dims.length) return [];

  // Cartesian product across the populated dimensions.
  let combos = [{}];
  for (const [key, values] of dims) {
    const next = [];
    for (const combo of combos) {
      for (const v of values) {
        next.push({ ...combo, [key]: String(v) });
      }
    }
    combos = next;
  }

  const totalStock = Number(product.countInStock || 0);
  const perCombo = combos.length > 0 ? Math.max(0, Math.floor(totalStock / combos.length)) : 0;
  const parentSku = product.sku || null;

  return combos.map((attrs, i) => {
    const label = Object.values(attrs).join(" / ");
    const slug = slugify(Object.values(attrs).join("-"));
    const sku = parentSku ? `${parentSku}-${slug}` : null;
    return {
      productId: product.id,
      sku,
      name: label || `Variant ${i + 1}`,
      attributes: attrs,
      price: Number(product.price || 0),
      stock: perCombo,
      isActive: true,
      position: i,
    };
  });
}

async function main() {
  console.log(`[backfill] ${APPLY ? "APPLY" : "DRY-RUN"} mode`);
  let scanned = 0;
  let toInsert = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let skippedNoVariants = 0;

  // Page through all products in chunks; includeAllStatuses so drafts/archived
  // also get backfilled.
  const PAGE_SIZE = 200;
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { products, totalPages } = await listProducts({
      page,
      perPage: PAGE_SIZE,
      includeAllStatuses: true,
    });
    if (!products.length) break;

    for (const product of products) {
      scanned += 1;

      const existing = await listVariantsByProductId(product.id);
      if (existing.length > 0) {
        skippedExisting += 1;
        continue;
      }

      const newVariants = variantsForProduct(product);
      if (newVariants.length === 0) {
        skippedNoVariants += 1;
        continue;
      }

      toInsert += newVariants.length;
      console.log(
        `  product ${product.id} "${product.name}" → ${newVariants.length} variant(s)` +
          (APPLY ? "" : " (dry-run)")
      );

      if (APPLY) {
        const n = await bulkCreateVariants(newVariants);
        inserted += n;
      }
    }

    if (page >= totalPages) break;
    page += 1;
  }

  console.log("");
  console.log(`[backfill] scanned: ${scanned} products`);
  console.log(`[backfill] skipped (already had variants): ${skippedExisting}`);
  console.log(`[backfill] skipped (no legacy variant arrays): ${skippedNoVariants}`);
  if (APPLY) {
    console.log(`[backfill] inserted: ${inserted} variant rows`);
  } else {
    console.log(`[backfill] would insert: ${toInsert} variant rows`);
    console.log(`[backfill] re-run with --apply to actually write them.`);
  }

  await getMysqlPool().end();
}

main().catch((err) => {
  console.error("[backfill] fatal:", err);
  process.exitCode = 1;
});
