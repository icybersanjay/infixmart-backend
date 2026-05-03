// Shared bulk-pricing tier resolver. Used by:
//   - Server-side checkout pricing (lib/server/services/orders.js)
//   - PDP "buy N for ₹X" hint (legacy ProductDetails page)
//   - Cart line subtotal display
//   - Admin ProductForm (preview)
//
// Tier shape: { minQty: number, price: number }. The matched tier is the one
// with the highest `minQty` ≤ ordered qty. If no tier matches (qty below the
// lowest minQty, or `priceTiers` empty/missing), the base product price wins.

/**
 * Coerce raw tier input from admins or DB into a clean, sorted array.
 * Drops invalid rows (non-positive qty/price), de-dupes by minQty, sorts asc.
 *
 * @param {unknown} input — array of {minQty, price} or null/undefined
 * @returns {Array<{minQty: number, price: number}>}
 */
export function normalizeTiers(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Map();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const minQty = Math.floor(Number(raw.minQty));
    const price = Number(raw.price);
    if (!Number.isFinite(minQty) || minQty < 2) continue; // tier 1 is the base price
    if (!Number.isFinite(price) || price < 0) continue;
    // Last-write-wins on duplicate minQty
    seen.set(minQty, { minQty, price: Math.round(price * 100) / 100 });
  }
  return Array.from(seen.values()).sort((a, b) => a.minQty - b.minQty);
}

/**
 * Pick the effective per-unit price for a given quantity.
 * Falls through to `basePrice` when no tier qualifies.
 *
 * @param {number} basePrice — the product's `price` column
 * @param {unknown} priceTiers — raw tiers from the DB / API
 * @param {number} qty — the line quantity
 * @returns {number} per-unit price for this line
 */
export function resolveTierPrice(basePrice, priceTiers, qty) {
  const base = Number(basePrice) || 0;
  const q = Math.floor(Number(qty) || 0);
  if (q < 1) return base;
  const tiers = normalizeTiers(priceTiers);
  let chosen = base;
  for (const tier of tiers) {
    if (q >= tier.minQty) {
      chosen = tier.price;
    } else {
      break;
    }
  }
  return chosen;
}

/**
 * Compute the next-tier savings hint for a PDP nudge ("Add 3 more for ₹X off!").
 * Returns null if the buyer is already on the cheapest tier.
 */
export function nextTierSavings(basePrice, priceTiers, qty) {
  const tiers = normalizeTiers(priceTiers);
  if (tiers.length === 0) return null;
  const q = Math.floor(Number(qty) || 0);
  const current = resolveTierPrice(basePrice, tiers, q);
  const next = tiers.find((t) => t.minQty > q);
  if (!next || next.price >= current) return null;
  const unitsAway = next.minQty - q;
  const perUnitSavings = current - next.price;
  return {
    unitsAway,
    nextMinQty: next.minQty,
    nextUnitPrice: next.price,
    perUnitSavings: Math.round(perUnitSavings * 100) / 100,
  };
}
