import { HttpError } from "../api/http.js";
import { findProductById } from "../repositories/products.js";
import { findVariantById } from "../repositories/product-variants.js";
import {
  clearCartItems,
  createCartItem,
  deleteCartItem,
  findCartItemByUserAndProduct,
  listCartItemsByUserId,
  updateCartItemQuantity,
} from "../repositories/cart.js";
import type { Id } from "../types.js";

interface AddToCartBody {
  productId?: Id | string;
  variantId?: Id | string | null;
}

interface CartEnvelope {
  message: string;
  error: boolean;
  success: boolean;
  data?: unknown;
  cartItem?: unknown;
}

export async function addToCart(
  userId: Id,
  body: AddToCartBody | null | undefined
): Promise<CartEnvelope> {
  const productId = Number(body?.productId);
  if (!productId) {
    throw new HttpError(400, "Product ID is required");
  }

  const product = await findProductById(productId);
  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  let variantId: number | null = null;
  if (body?.variantId !== undefined && body?.variantId !== null && body?.variantId !== "") {
    variantId = Number(body.variantId);
    if (!Number.isInteger(variantId) || variantId <= 0) {
      throw new HttpError(400, "Invalid variant ID");
    }
    const variant = await findVariantById(variantId);
    if (!variant) {
      throw new HttpError(404, "Variant not found");
    }
    if (Number(variant.productId) !== Number(productId)) {
      throw new HttpError(400, "Variant does not belong to this product");
    }
    if (!variant.isActive) {
      throw new HttpError(400, "This variant is no longer available");
    }
  }

  const existing = await findCartItemByUserAndProduct(userId, productId, variantId);
  if (existing) {
    return { message: "Product already in cart", error: true, success: false };
  }

  return {
    data: await createCartItem(userId, productId, 1, variantId),
    message: "Product added to cart successfully",
    error: false,
    success: true,
  };
}

export async function getCartItems(userId: Id): Promise<CartEnvelope> {
  return {
    cartItem: await listCartItemsByUserId(userId),
    message: "Cart items fetched successfully",
    error: false,
    success: true,
  };
}

interface CartIdBody {
  _id?: Id | string;
  quantity?: number | string;
}

export async function updateCartQuantity(
  userId: Id,
  body: CartIdBody | null | undefined
): Promise<CartEnvelope> {
  const cartItemId = Number(body?._id);
  const quantity = Number(body?.quantity);
  if (!cartItemId || !quantity) {
    throw new HttpError(400, "Cart item ID and quantity are required");
  }
  if (quantity < 1) {
    throw new HttpError(400, "Quantity must be at least 1");
  }

  const updated = await updateCartItemQuantity(cartItemId, userId, quantity);
  if (!updated) {
    throw new HttpError(404, "Cart item not found");
  }

  return {
    message: "Cart item quantity updated successfully",
    error: false,
    success: true,
  };
}

export async function removeCartItem(
  userId: Id,
  body: CartIdBody | null | undefined
): Promise<CartEnvelope> {
  const cartItemId = Number(body?._id);
  if (!cartItemId) {
    throw new HttpError(400, "Cart item ID is required");
  }

  const deleted = await deleteCartItem(cartItemId, userId);
  if (!deleted) {
    throw new HttpError(404, "Cart item not found");
  }

  return {
    message: "Cart item removed successfully",
    error: false,
    success: true,
  };
}

export async function clearCart(userId: Id): Promise<CartEnvelope> {
  await clearCartItems(userId);
  return { message: "Cart cleared", error: false, success: true };
}
