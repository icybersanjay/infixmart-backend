import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/server/repositories/coupons.js", () => ({
  findCouponByCode: vi.fn(),
  findCouponById: vi.fn(),
  listCoupons: vi.fn(),
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
}));

vi.mock("../lib/server/db/mysql.js", () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

const { findCouponByCode } = await import("../lib/server/repositories/coupons.js");
const { query } = await import("../lib/server/db/mysql.js");
const { applyCouponCode, checkCouponRestrictions } = await import(
  "../lib/server/services/coupons.js"
);

function makeCoupon(overrides = {}) {
  return {
    id: 1,
    code: "SAVE10",
    type: "percent",
    value: 10,
    minOrderValue: 0,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    isActive: true,
    expiresAt: null,
    restrictionType: "none",
    restrictedEmail: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyCouponCode", () => {
  it("rejects an empty code", async () => {
    const out = await applyCouponCode({ code: "", cartTotal: 1000 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/required/i);
    expect(findCouponByCode).not.toHaveBeenCalled();
  });

  it("normalizes the code (uppercases + trims) before lookup", async () => {
    findCouponByCode.mockResolvedValueOnce(makeCoupon({ code: "SAVE10" }));
    await applyCouponCode({ code: "  save10  ", cartTotal: 1000 });
    expect(findCouponByCode).toHaveBeenCalledWith("SAVE10");
  });

  it("rejects an unknown code", async () => {
    findCouponByCode.mockResolvedValueOnce(null);
    const out = await applyCouponCode({ code: "NOPE", cartTotal: 1000 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/invalid|expired/i);
  });

  it("rejects an inactive coupon", async () => {
    findCouponByCode.mockResolvedValueOnce(makeCoupon({ isActive: false }));
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.error).toBe(true);
  });

  it("rejects an expired coupon", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ expiresAt: "2020-01-01T00:00:00Z" })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/expired/i);
  });

  it("accepts a coupon with a future expiry", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ expiresAt: future })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.error).toBe(false);
    expect(out.discount).toBe(100);
  });

  it("rejects when usage limit has been reached", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ usageLimit: 5, usageCount: 5 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/usage limit/i);
  });

  it("allows usage when below the usage limit", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ usageLimit: 5, usageCount: 4 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.error).toBe(false);
  });

  it("rejects when cart total is below minOrderValue", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ minOrderValue: 500 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 200 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/minimum order value/i);
  });

  it("returns a percent discount and the coupon code on success", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ type: "percent", value: 25 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 400 });
    expect(out.error).toBe(false);
    expect(out.discount).toBe(100);
    expect(out.couponCode).toBe("SAVE10");
    expect(out.type).toBe("percent");
  });

  it("caps a percent discount at maxDiscount", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ type: "percent", value: 50, maxDiscount: 100 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 1000 });
    expect(out.discount).toBe(100);
  });

  it("never lets a flat discount exceed the cart total", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ type: "flat", value: 1000 })
    );
    const out = await applyCouponCode({ code: "SAVE10", cartTotal: 200 });
    expect(out.discount).toBe(200);
  });

  it("rejects a restricted coupon for guest users", async () => {
    findCouponByCode.mockResolvedValueOnce(
      makeCoupon({ restrictionType: "first_order" })
    );
    const out = await applyCouponCode({ code: "FIRST", cartTotal: 1000 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/log in/i);
  });
});

describe("checkCouponRestrictions", () => {
  it("returns silently when restrictionType is 'none'", async () => {
    await expect(
      checkCouponRestrictions(makeCoupon({ restrictionType: "none" }), 1)
    ).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it("requires a logged-in user when a restriction is set", async () => {
    await expect(
      checkCouponRestrictions(
        makeCoupon({ restrictionType: "first_order" }),
        null
      )
    ).rejects.toMatchObject({ status: 401 });
  });

  describe("first_order restriction", () => {
    it("passes when the user has zero paid orders", async () => {
      query.mockResolvedValueOnce([{ cnt: 0 }]);
      await expect(
        checkCouponRestrictions(
          makeCoupon({ restrictionType: "first_order" }),
          42
        )
      ).resolves.toBeUndefined();
    });

    it("rejects when the user has at least one paid order", async () => {
      query.mockResolvedValueOnce([{ cnt: 3 }]);
      await expect(
        checkCouponRestrictions(
          makeCoupon({ restrictionType: "first_order" }),
          42
        )
      ).rejects.toMatchObject({
        status: 403,
        message: expect.stringMatching(/first-time/i),
      });
    });
  });

  describe("email restriction", () => {
    it("passes when the user's email matches (case-insensitive)", async () => {
      query.mockResolvedValueOnce([{ email: "User@Example.COM" }]);
      await expect(
        checkCouponRestrictions(
          makeCoupon({
            restrictionType: "email",
            restrictedEmail: "user@example.com",
          }),
          42
        )
      ).resolves.toBeUndefined();
    });

    it("rejects when the user's email does not match", async () => {
      query.mockResolvedValueOnce([{ email: "other@example.com" }]);
      await expect(
        checkCouponRestrictions(
          makeCoupon({
            restrictionType: "email",
            restrictedEmail: "user@example.com",
          }),
          42
        )
      ).rejects.toMatchObject({ status: 403 });
    });

    it("rejects when no restrictedEmail is configured on the coupon", async () => {
      query.mockResolvedValueOnce([{ email: "user@example.com" }]);
      await expect(
        checkCouponRestrictions(
          makeCoupon({
            restrictionType: "email",
            restrictedEmail: null,
          }),
          42
        )
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
