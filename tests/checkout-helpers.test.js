import { describe, it, expect } from "vitest";
import {
  getCouponDiscount,
  normalizeCheckoutItems,
  roundMoney,
} from "../lib/server/services/orders.js";

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(99.999)).toBe(100);
    expect(roundMoney(99.991)).toBe(99.99);
    expect(roundMoney(99.995)).toBe(100);
  });

  it("treats nullish values as 0", () => {
    // Callers in services/orders.js always pass numbers, nulls, or undefineds
    // (no caller passes arbitrary strings), so we only assert the cases that
    // can actually happen.
    expect(roundMoney(null)).toBe(0);
    expect(roundMoney(undefined)).toBe(0);
    expect(roundMoney("")).toBe(0);
    expect(roundMoney(0)).toBe(0);
  });
});

describe("normalizeCheckoutItems", () => {
  it("accepts the cart-item shape and merges duplicate products by qty", () => {
    const out = normalizeCheckoutItems([
      { productId: 1, qty: 2, cartItemId: 11 },
      { productId: 2, qty: 1, cartItemId: 12 },
      { productId: 1, qty: 3, cartItemId: 13 },
    ]);
    const item1 = out.find((it) => it.productId === 1);
    const item2 = out.find((it) => it.productId === 2);
    expect(item1.qty).toBe(5);
    expect(item1.cartItemIds).toEqual([11, 13]);
    expect(item2.qty).toBe(1);
  });

  it("accepts the legacy `product`/`quantity`/`id` field names", () => {
    const out = normalizeCheckoutItems([
      { product: 7, quantity: 4, id: 99 },
    ]);
    // variantId defaults to null (no variant selected) — stays in the shape
    // so the downstream merge key `${productId}:${variantId ?? "_"}` works.
    expect(out).toEqual([
      { productId: 7, variantId: null, qty: 4, cartItemIds: [99] },
    ]);
  });

  it("keeps lines with the same productId but different variantId separate", () => {
    const out = normalizeCheckoutItems([
      { productId: 7, qty: 1, variantId: 100 },
      { productId: 7, qty: 2, variantId: 200 },
      { productId: 7, qty: 1, variantId: 100 },
    ]);
    expect(out).toHaveLength(2);
    const v100 = out.find((it) => it.variantId === 100);
    const v200 = out.find((it) => it.variantId === 200);
    expect(v100.qty).toBe(2);
    expect(v200.qty).toBe(2);
  });

  it("rejects an invalid variantId payload", () => {
    expect(() =>
      normalizeCheckoutItems([{ productId: 1, qty: 1, variantId: "abc" }])
    ).toThrow(/variant/i);
    expect(() =>
      normalizeCheckoutItems([{ productId: 1, qty: 1, variantId: -5 }])
    ).toThrow(/variant/i);
  });

  it("throws when the cart is empty", () => {
    expect(() => normalizeCheckoutItems([])).toThrow(/empty/i);
    expect(() => normalizeCheckoutItems(null)).toThrow(/empty/i);
  });

  it("throws on non-positive quantities or invalid product ids", () => {
    expect(() => normalizeCheckoutItems([{ productId: 1, qty: 0 }])).toThrow();
    expect(() => normalizeCheckoutItems([{ productId: 1, qty: -2 }])).toThrow();
    expect(() => normalizeCheckoutItems([{ productId: "x", qty: 1 }])).toThrow();
    expect(() => normalizeCheckoutItems([{ productId: 0, qty: 1 }])).toThrow();
  });
});

describe("getCouponDiscount", () => {
  it("returns 0 when no coupon", () => {
    expect(getCouponDiscount(null, 1000)).toBe(0);
    expect(getCouponDiscount(undefined, 1000)).toBe(0);
  });

  it("computes a percent discount", () => {
    expect(getCouponDiscount({ type: "percent", value: 10 }, 1000)).toBe(100);
    expect(getCouponDiscount({ type: "percent", value: 25 }, 200)).toBe(50);
  });

  it("caps a percent discount at maxDiscount when set", () => {
    expect(
      getCouponDiscount({ type: "percent", value: 50, maxDiscount: 100 }, 1000)
    ).toBe(100);
  });

  it("computes a flat discount", () => {
    expect(getCouponDiscount({ type: "flat", value: 75 }, 1000)).toBe(75);
  });

  it("never lets the discount exceed the cart total", () => {
    expect(getCouponDiscount({ type: "flat", value: 1000 }, 200)).toBe(200);
    expect(
      getCouponDiscount({ type: "percent", value: 100 }, 200)
    ).toBe(200);
  });

  it("returns rounded money values (no fractional pennies)", () => {
    const out = getCouponDiscount({ type: "percent", value: 33 }, 199);
    expect(out * 100).toBe(Math.round(out * 100));
  });
});
