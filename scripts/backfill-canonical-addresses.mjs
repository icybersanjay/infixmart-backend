#!/usr/bin/env node
/**
 * Optional one-time backfill: rewrite legacy `Orders.shippingAddress` JSON
 * blobs into the canonical shape `buildCanonicalAddress()` produces today.
 *
 * Why this exists
 * ───────────────
 *   Pre-A1, two address shapes coexisted in the wild:
 *     • saved-address shape:  name, mobile, flatHouse, areaStreet, ...
 *     • inline-checkout:      fullName, phone, addressLine, city, postalCode
 *   The post-A1 reader code already handles both via legacy aliases on the
 *   canonical shape — so this backfill is **strictly cosmetic**: it makes the
 *   stored JSON match what `normalizeShippingAddressInput()` produces on new
 *   orders. Useful before you eventually drop the legacy aliases (`phone`,
 *   `address`, `city`, `postalCode`) from canonical output.
 *
 *   You probably don't need to run this. Skip unless you're planning that
 *   alias-removal cleanup.
 *
 * Behavior
 * ────────
 *   • Reads every `Orders.shippingAddress` row in batches of 200.
 *   • Re-canonicalises via the same `buildCanonicalAddress()` the live code
 *     uses, then UPDATEs the row only if the JSON changed.
 *   • Idempotent: re-running is a no-op once everything is canonical.
 *   • Defaults to dry-run; pass `--apply` to actually write.
 *
 * Usage
 * ─────
 *   # dry-run
 *   node --experimental-strip-types scripts/backfill-canonical-addresses.mjs
 *
 *   # actually write
 *   node --experimental-strip-types scripts/backfill-canonical-addresses.mjs --apply
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

const APPLY = process.argv.includes("--apply");

const { getMysqlPool, query, execute } = await import("../lib/server/db/mysql.js");
const { buildCanonicalAddress } = await import("../lib/server/services/orders.js");

function tryParse(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Legacy → canonical input mapping. Same forgiving fallbacks the runtime uses
// in normalizeShippingAddressInput().
function toCanonicalInput(addr) {
  return {
    name:       addr.name       || addr.fullName,
    mobile:     addr.mobile     || addr.phone,
    flatHouse:  addr.flatHouse  || addr.addressLine || addr.address,
    areaStreet: addr.areaStreet,
    landmark:   addr.landmark,
    townCity:   addr.townCity   || addr.city,
    state:      addr.state,
    pincode:    addr.pincode    || addr.postalCode,
    country:    addr.country,
  };
}

// Compare two canonical objects field-by-field. Whitespace-tolerant + order-
// independent. Returns true when the stored shape already matches what
// `buildCanonicalAddress` would emit.
function canonicalMatches(a, b) {
  if (!a || !b) return false;
  const keys = [
    "name", "mobile", "flatHouse", "areaStreet", "landmark",
    "townCity", "state", "pincode", "country",
    "phone", "address", "city", "postalCode",
  ];
  for (const k of keys) {
    if (String(a[k] || "") !== String(b[k] || "")) return false;
  }
  return true;
}

async function main() {
  console.log(`[backfill-addr] ${APPLY ? "APPLY" : "DRY-RUN"} mode`);

  const PAGE = 200;
  let offset = 0;
  let scanned = 0;
  let needsUpdate = 0;
  let updated = 0;
  let skippedEmpty = 0;
  let skippedAlreadyCanonical = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await query(
      `SELECT id, shippingAddress FROM Orders ORDER BY id ASC LIMIT :limit OFFSET :offset`,
      { limit: PAGE, offset }
    );
    if (!rows.length) break;

    for (const row of rows) {
      scanned += 1;
      const stored = tryParse(row.shippingAddress);
      if (!stored || typeof stored !== "object") {
        skippedEmpty += 1;
        continue;
      }

      const canonical = buildCanonicalAddress(toCanonicalInput(stored));

      // Skip writes when the stored shape already matches the canonical output.
      if (canonicalMatches(stored, canonical)) {
        skippedAlreadyCanonical += 1;
        continue;
      }

      needsUpdate += 1;
      console.log(`  order ${row.id}: would rewrite address`);

      if (APPLY) {
        await execute(
          `UPDATE Orders SET shippingAddress = :addr WHERE id = :id`,
          { addr: JSON.stringify(canonical), id: row.id }
        );
        updated += 1;
      }
    }

    offset += PAGE;
  }

  console.log("");
  console.log(`[backfill-addr] scanned: ${scanned}`);
  console.log(`[backfill-addr] already canonical: ${skippedAlreadyCanonical}`);
  console.log(`[backfill-addr] empty/null shippingAddress: ${skippedEmpty}`);
  if (APPLY) {
    console.log(`[backfill-addr] updated: ${updated}`);
  } else {
    console.log(`[backfill-addr] would update: ${needsUpdate}`);
    console.log(`[backfill-addr] re-run with --apply to commit.`);
  }

  await getMysqlPool().end();
}

main().catch((err) => {
  console.error("[backfill-addr] fatal:", err);
  process.exitCode = 1;
});
