import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/server/repositories/cart.js", () => ({
  clearCartItems: vi.fn(),
  createCartItem: vi.fn(),
  deleteCartItem: vi.fn(),
  findCartItemByUserAndProduct: vi.fn(),
  listCartItemsByUserId: vi.fn(),
  updateCartItemQuantity: vi.fn(),
}));

vi.mock("../lib/server/repositories/products.js", () => ({
  findProductById: vi.fn(),
}));

vi.mock("../lib/server/repositories/product-variants.js", () => ({
  findVariantById: vi.fn(),
}));

const cartRepo = await import("../lib/server/repositories/cart.js");
const productRepo = await import("../lib/server/repositories/products.js");
const variantsRepo = await import("../lib/server/repositories/product-variants.js");
const {
  addToCart,
  clearCart,
  getCartItems,
  removeCartItem,
  updateCartQuantity,
} = await import("../lib/server/services/cart.js");

const USER_ID = 42;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addToCart", () => {
  it("rejects a missing productId", async () => {
    await expect(addToCart(USER_ID, {})).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/product id/i),
    });
    expect(productRepo.findProductById).not.toHaveBeenCalled();
  });

  it("rejects when productId is not numeric", async () => {
    await expect(addToCart(USER_ID, { productId: "abc" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("throws 404 when the product does not exist", async () => {
    productRepo.findProductById.mockResolvedValueOnce(null);
    await expect(addToCart(USER_ID, { productId: 1 })).rejects.toMatchObject({
      status: 404,
    });
    expect(cartRepo.createCartItem).not.toHaveBeenCalled();
  });

  it("returns a soft-error when the product is already in cart (no duplicate row)", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 1 });
    cartRepo.findCartItemByUserAndProduct.mockResolvedValueOnce({ id: 99 });
    const out = await addToCart(USER_ID, { productId: 1 });
    expect(out.error).toBe(true);
    expect(out.message).toMatch(/already/i);
    expect(cartRepo.createCartItem).not.toHaveBeenCalled();
  });

  it("creates a new cart row when product is fresh to the cart", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 7 });
    cartRepo.findCartItemByUserAndProduct.mockResolvedValueOnce(null);
    cartRepo.createCartItem.mockResolvedValueOnce({ id: 123, productId: 7, qty: 1 });
    const out = await addToCart(USER_ID, { productId: 7 });
    expect(out.success).toBe(true);
    expect(out.data).toEqual({ id: 123, productId: 7, qty: 1 });
    // Signature: createCartItem(userId, productId, quantity, variantId)
    expect(cartRepo.createCartItem).toHaveBeenCalledWith(USER_ID, 7, 1, null);
  });

  it("attaches a valid variantId to the new cart row", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 7 });
    variantsRepo.findVariantById.mockResolvedValueOnce({
      id: 42, productId: 7, isActive: true, price: 100, stock: 5,
    });
    cartRepo.findCartItemByUserAndProduct.mockResolvedValueOnce(null);
    cartRepo.createCartItem.mockResolvedValueOnce({ id: 123, productId: 7, variantId: 42, qty: 1 });
    const out = await addToCart(USER_ID, { productId: 7, variantId: 42 });
    expect(out.success).toBe(true);
    expect(cartRepo.findCartItemByUserAndProduct).toHaveBeenCalledWith(USER_ID, 7, 42);
    expect(cartRepo.createCartItem).toHaveBeenCalledWith(USER_ID, 7, 1, 42);
  });

  it("rejects a variantId that belongs to a different product", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 7 });
    variantsRepo.findVariantById.mockResolvedValueOnce({
      id: 42, productId: 99, isActive: true, price: 100, stock: 5,
    });
    await expect(addToCart(USER_ID, { productId: 7, variantId: 42 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/does not belong/i),
    });
    expect(cartRepo.createCartItem).not.toHaveBeenCalled();
  });

  it("rejects an inactive variant", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 7 });
    variantsRepo.findVariantById.mockResolvedValueOnce({
      id: 42, productId: 7, isActive: false, price: 100, stock: 5,
    });
    await expect(addToCart(USER_ID, { productId: 7, variantId: 42 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/no longer available/i),
    });
  });

  it("rejects an unknown variantId", async () => {
    productRepo.findProductById.mockResolvedValueOnce({ id: 7 });
    variantsRepo.findVariantById.mockResolvedValueOnce(null);
    await expect(addToCart(USER_ID, { productId: 7, variantId: 999 })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getCartItems", () => {
  it("delegates to the repo and wraps the response", async () => {
    cartRepo.listCartItemsByUserId.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const out = await getCartItems(USER_ID);
    expect(out.success).toBe(true);
    expect(out.cartItem).toHaveLength(2);
    expect(cartRepo.listCartItemsByUserId).toHaveBeenCalledWith(USER_ID);
  });
});

describe("updateCartQuantity", () => {
  it("rejects a missing _id or quantity", async () => {
    await expect(updateCartQuantity(USER_ID, { _id: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(updateCartQuantity(USER_ID, { quantity: 2 })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects quantity below 1 when one is provided", async () => {
    // qty=0 short-circuits on the truthy check above (0 is falsy → "required");
    // negative values reach the explicit < 1 guard.
    await expect(
      updateCartQuantity(USER_ID, { _id: 1, quantity: -1 })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/at least 1/i),
    });
  });

  it("throws 404 when the row is not owned by the user", async () => {
    cartRepo.updateCartItemQuantity.mockResolvedValueOnce(false);
    await expect(
      updateCartQuantity(USER_ID, { _id: 1, quantity: 3 })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("succeeds when the repo confirms the update", async () => {
    cartRepo.updateCartItemQuantity.mockResolvedValueOnce(true);
    const out = await updateCartQuantity(USER_ID, { _id: 1, quantity: 3 });
    expect(out.success).toBe(true);
    expect(cartRepo.updateCartItemQuantity).toHaveBeenCalledWith(1, USER_ID, 3);
  });
});

describe("removeCartItem", () => {
  it("rejects a missing _id", async () => {
    await expect(removeCartItem(USER_ID, {})).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when the row is not found", async () => {
    cartRepo.deleteCartItem.mockResolvedValueOnce(false);
    await expect(removeCartItem(USER_ID, { _id: 1 })).rejects.toMatchObject({ status: 404 });
  });

  it("succeeds when the repo confirms the delete", async () => {
    cartRepo.deleteCartItem.mockResolvedValueOnce(true);
    const out = await removeCartItem(USER_ID, { _id: 1 });
    expect(out.success).toBe(true);
    expect(cartRepo.deleteCartItem).toHaveBeenCalledWith(1, USER_ID);
  });
});

describe("clearCart", () => {
  it("delegates to the repo", async () => {
    cartRepo.clearCartItems.mockResolvedValueOnce(undefined);
    const out = await clearCart(USER_ID);
    expect(out.success).toBe(true);
    expect(cartRepo.clearCartItems).toHaveBeenCalledWith(USER_ID);
  });
});
