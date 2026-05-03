import { describe, it, expect } from "vitest";
import {
  normalizeTiers,
  resolveTierPrice,
  nextTierSavings,
} from "../lib/shared/price-tiers.js";

describe("normalizeTiers", () => {
  it("returns [] for non-array input", () => {
    expect(normalizeTiers(null)).toEqual([]);
    expect(normalizeTiers(undefined)).toEqual([]);
    expect(normalizeTiers("[]")).toEqual([]);
    expect(normalizeTiers({})).toEqual([]);
  });

  it("drops rows with non-positive qty/price or qty < 2", () => {
    const out = normalizeTiers([
      { minQty: 1,   price: 100 },   // qty 1 invalid (tier 1 = base price)
      { minQty: 0,   price: 100 },
      { minQty: 5,   price: -10 },
      { minQty: 5,   price: "abc" },
      { minQty: "x", price: 100 },
      { minQty: 10,  price: 90 },    // valid
    ]);
    expect(out).toEqual([{ minQty: 10, price: 90 }]);
  });

  it("rounds price to 2dp and floors qty", () => {
    const out = normalizeTiers([
      { minQty: 5.7, price: 99.999 },
    ]);
    expect(out).toEqual([{ minQty: 5, price: 100 }]);
  });

  it("dedupes by minQty (last write wins) and sorts ascending", () => {
    const out = normalizeTiers([
      { minQty: 50, price: 80 },
      { minQty: 10, price: 95 },
      { minQty: 50, price: 75 },   // override
      { minQty: 25, price: 85 },
    ]);
    expect(out).toEqual([
      { minQty: 10, price: 95 },
      { minQty: 25, price: 85 },
      { minQty: 50, price: 75 },
    ]);
  });
});

describe("resolveTierPrice", () => {
  const tiers = [
    { minQty: 10, price: 90 },
    { minQty: 25, price: 80 },
    { minQty: 50, price: 70 },
  ];

  it("returns base price when qty < lowest tier minQty", () => {
    expect(resolveTierPrice(100, tiers, 1)).toBe(100);
    expect(resolveTierPrice(100, tiers, 9)).toBe(100);
  });

  it("picks the highest matching tier (not the first one >= qty)", () => {
    expect(resolveTierPrice(100, tiers, 10)).toBe(90);
    expect(resolveTierPrice(100, tiers, 24)).toBe(90);
    expect(resolveTierPrice(100, tiers, 25)).toBe(80);
    expect(resolveTierPrice(100, tiers, 49)).toBe(80);
    expect(resolveTierPrice(100, tiers, 50)).toBe(70);
    expect(resolveTierPrice(100, tiers, 999)).toBe(70);
  });

  it("returns base price when tiers are empty/missing/invalid", () => {
    expect(resolveTierPrice(100, [], 50)).toBe(100);
    expect(resolveTierPrice(100, null, 50)).toBe(100);
    expect(resolveTierPrice(100, undefined, 50)).toBe(100);
  });

  it("ignores non-positive qty (returns base)", () => {
    expect(resolveTierPrice(100, tiers, 0)).toBe(100);
    expect(resolveTierPrice(100, tiers, -5)).toBe(100);
  });

  it("normalizes raw tier input on the fly (caller doesn't have to pre-clean)", () => {
    const messy = [
      { minQty: 25, price: 80 },
      { minQty: 10, price: 90 },
      { minQty: 1,  price: 999 }, // invalid — dropped
    ];
    expect(resolveTierPrice(100, messy, 25)).toBe(80);
  });
});

describe("nextTierSavings", () => {
  const tiers = [
    { minQty: 10, price: 90 },
    { minQty: 25, price: 80 },
  ];

  it("returns null when there are no tiers", () => {
    expect(nextTierSavings(100, [], 5)).toBeNull();
    expect(nextTierSavings(100, null, 5)).toBeNull();
  });

  it("returns the gap to the next tier when qty is below it", () => {
    const out = nextTierSavings(100, tiers, 7);
    expect(out).toEqual({
      unitsAway: 3,
      nextMinQty: 10,
      nextUnitPrice: 90,
      perUnitSavings: 10, // base 100 → tier 90
    });
  });

  it("returns the gap to the *next-higher* tier when already on a lower one", () => {
    const out = nextTierSavings(100, tiers, 12);
    expect(out).toEqual({
      unitsAway: 13,
      nextMinQty: 25,
      nextUnitPrice: 80,
      perUnitSavings: 10, // current 90 → next 80
    });
  });

  it("returns null on the cheapest tier", () => {
    expect(nextTierSavings(100, tiers, 25)).toBeNull();
    expect(nextTierSavings(100, tiers, 100)).toBeNull();
  });
});
