import type { PoolConnection } from "mysql2/promise";
import { HttpError } from "../api/http.js";
import { getMysqlPool } from "../db/mysql.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendNewOrderAdminEmail } from "../email/order-confirmation.js";
import { sendOrderPlacedSms, sendOrderShippedSms, sendOrderDeliveredSms } from "../sms/fast2sms.js";
import { sendOrderPlacedWhatsApp, sendOrderShippedWhatsApp, sendOrderDeliveredWhatsApp } from "../whatsapp/meta.js";
import { findAddressByIdForUser } from "../repositories/addresses.js";
import { deleteCartItemsByIds, listCartLinesByUserId } from "../repositories/cart.js";
import { findCouponByCode, incrementCouponUsage } from "../repositories/coupons.js";
import { findProductById as findProductByIdRepo } from "../repositories/products.js";
import { sendLowStockAlertEmail } from "../email/low-stock-alert.js";
import { checkCouponRestrictions } from "./coupons.js";
import { ensureInvoiceNumber } from "./invoices.js";
import {
  bulkUpdateOrderStatus,
  createOrder,
  createOrderItems,
  findOrderById,
  findOrderByIdempotencyKey,
  findPaidOrderByPaymentId,
  listAllOrders,
  listOrdersByUserId,
  markOrderCancelled,
  updateOrderStatus as updateOrderStatusRepo,
} from "../repositories/orders.js";
import { creditWallet, findUserById } from "../repositories/users.js";
import { getReferralByReferee, markReferralCredited } from "../repositories/referrals.js";
import { sendPushToUser } from "../push/web-push.js";
import { resolveTrackingUrl } from "../../shared/tracking-url.js";
import { resolveTierPrice } from "../../shared/price-tiers.js";
import type { Id, OrderItem, OrderStatus, ShippingAddress } from "../types.js";

const DEFAULT_FREE_SHIPPING_THRESHOLD = 999;
const DEFAULT_SHIPPING_COST = 49;

export function roundMoney(value: unknown): number {
  return Math.round(Number(value || 0) * 100) / 100;
}

interface ErrorWithStatus extends Error {
  status: number;
}

export function createHttpError(status: number, message: string): ErrorWithStatus {
  const error = new Error(message) as ErrorWithStatus;
  error.status = status;
  return error;
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return fallback;
  }
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

interface RawAddressInput {
  name?: string;
  fullName?: string;
  mobile?: string;
  phone?: string;
  flatHouse?: string;
  addressLine?: string;
  address?: string;
  areaStreet?: string;
  landmark?: string;
  townCity?: string;
  city?: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  country?: string;
}

interface CanonicalAddressInput {
  name?: string | null;
  mobile?: string | null;
  flatHouse?: string | null;
  areaStreet?: string | null;
  landmark?: string | null;
  townCity?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}

export function buildCanonicalAddress({
  name,
  mobile,
  flatHouse,
  areaStreet,
  landmark,
  townCity,
  state,
  pincode,
  country,
}: CanonicalAddressInput): Required<ShippingAddress> {
  const trim = (v: unknown) => String(v || "").trim();
  const fullName = trim(name);
  const phone = trim(mobile);
  const flatHouse_ = trim(flatHouse);
  const areaStreet_ = trim(areaStreet);
  const landmark_ = trim(landmark);
  const townCity_ = trim(townCity);
  const state_ = trim(state);
  const pincode_ = trim(pincode);
  const country_ = trim(country) || "India";
  const composedLine =
    flatHouse_ + (areaStreet_ ? `, ${areaStreet_}` : "") + (landmark_ ? `, ${landmark_}` : "");

  return {
    name: fullName,
    mobile: phone,
    flatHouse: flatHouse_,
    areaStreet: areaStreet_,
    landmark: landmark_,
    townCity: townCity_,
    state: state_,
    pincode: pincode_,
    country: country_,
    phone,
    address: composedLine,
    city: townCity_,
    postalCode: pincode_,
    fullName,
    addressLine: composedLine,
  };
}

export function normalizeShippingAddressInput(shippingAddress: RawAddressInput | null | undefined) {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw createHttpError(400, "Delivery address is required.");
  }

  const flatHouse = shippingAddress.flatHouse || shippingAddress.addressLine || shippingAddress.address || "";
  const canonical = buildCanonicalAddress({
    name: shippingAddress.name || shippingAddress.fullName,
    mobile: shippingAddress.mobile || shippingAddress.phone,
    flatHouse,
    areaStreet: shippingAddress.areaStreet,
    landmark: shippingAddress.landmark,
    townCity: shippingAddress.townCity || shippingAddress.city,
    state: shippingAddress.state,
    pincode: shippingAddress.pincode || shippingAddress.postalCode,
    country: shippingAddress.country,
  });

  if (!canonical.name || !canonical.mobile || !canonical.flatHouse || !canonical.townCity || !canonical.state || !canonical.pincode) {
    throw createHttpError(400, "Delivery address is incomplete.");
  }

  return canonical;
}

function mapAddressRecord(address: CanonicalAddressInput) {
  return buildCanonicalAddress({
    name: address.name,
    mobile: address.mobile,
    flatHouse: address.flatHouse,
    areaStreet: address.areaStreet,
    landmark: address.landmark,
    townCity: address.townCity,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  });
}

interface NormalizedItem {
  productId: number;
  variantId: number | null;
  qty: number;
  cartItemIds: number[];
}

interface RawCheckoutItem {
  product?: Id;
  productId?: Id;
  qty?: number;
  quantity?: number;
  cartItemId?: Id;
  id?: Id;
  variantId?: Id | null | "";
}

export function normalizeCheckoutItems(items: RawCheckoutItem[]): NormalizedItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, "Your cart is empty.");
  }

  const merged = new Map<string, NormalizedItem>();
  for (const rawItem of items) {
    const productId = toPositiveInteger(rawItem?.product ?? rawItem?.productId);
    const qty = toPositiveInteger(rawItem?.qty ?? rawItem?.quantity);
    const cartItemId = toPositiveInteger(rawItem?.cartItemId ?? rawItem?.id);
    const rawVariant = rawItem?.variantId;
    const variantId =
      rawVariant === null || rawVariant === undefined || rawVariant === ""
        ? null
        : toPositiveInteger(rawVariant);
    if (!productId || !qty) {
      throw createHttpError(400, "Invalid checkout item payload.");
    }
    if (rawVariant !== null && rawVariant !== undefined && rawVariant !== "" && !variantId) {
      throw createHttpError(400, "Invalid variant ID in checkout payload.");
    }

    const key = `${productId}:${variantId ?? "_"}`;
    const existing = merged.get(key) || { productId, variantId, qty: 0, cartItemIds: [] };
    existing.qty += qty;
    if (cartItemId) existing.cartItemIds.push(cartItemId);
    merged.set(key, existing);
  }

  return [...merged.values()];
}

interface CheckoutSettings {
  gstPercent: number;
  cartMilestones: Array<{ amount?: number; type?: string; enabled?: boolean }>;
  minOrderValue: number;
}

async function loadCheckoutSettings(conn: PoolConnection): Promise<CheckoutSettings> {
  const rows = await runQuery<{ key: string; value: string | null }>(
    conn,
    `SELECT \`key\`, \`value\`
     FROM StoreSettings`
  );

  const map = rows.reduce<Record<string, string | null>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    gstPercent: Math.max(0, Number(map.gst_percent) || 0),
    cartMilestones: safeJsonParse(map.cart_milestones || "[]", [] as Array<{ amount?: number; type?: string; enabled?: boolean }>),
    minOrderValue: Math.max(0, Number(map.min_order_value) || 0),
  };
}

interface CouponLike {
  type: string;
  value: number;
  maxDiscount: number | null;
}

export function getCouponDiscount(coupon: CouponLike | null | undefined, total: number): number {
  if (!coupon) return 0;

  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.round((total * coupon.value) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Number(coupon.value || 0);
  }

  return Math.min(roundMoney(discount), roundMoney(total));
}

interface ResolveAddressArgs {
  userId: Id;
  addressId?: Id | null;
  shippingAddress?: RawAddressInput | null;
}

async function resolveShippingAddress({ userId, addressId, shippingAddress }: ResolveAddressArgs) {
  if (addressId) {
    const address = await findAddressByIdForUser(addressId, userId);
    if (!address) {
      throw createHttpError(400, "Selected address was not found.");
    }
    return mapAddressRecord(address);
  }

  return normalizeShippingAddressInput(shippingAddress);
}

interface ValidateCouponArgs {
  couponCode?: string | null;
  baseTotal: number;
  conn: PoolConnection;
  userId?: Id | null;
}

async function validateCoupon({ couponCode, baseTotal, conn, userId = null }: ValidateCouponArgs) {
  if (!couponCode) {
    return { couponId: null, couponCode: null, couponDiscount: 0 };
  }

  const coupon = await findCouponByCode(String(couponCode).toUpperCase().trim(), conn);
  if (!coupon || !coupon.isActive) {
    throw createHttpError(400, "Invalid or expired coupon code.");
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt as string | Date) < new Date()) {
    throw createHttpError(400, "This coupon has expired.");
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw createHttpError(400, "This coupon has reached its usage limit.");
  }
  if (baseTotal < coupon.minOrderValue) {
    throw createHttpError(400, `Minimum order value ₹${coupon.minOrderValue} required for this coupon.`);
  }

  await checkCouponRestrictions(coupon, userId, conn);

  return {
    couponId: coupon.id,
    couponCode: coupon.code,
    couponDiscount: getCouponDiscount({ type: coupon.type, value: coupon.value, maxDiscount: coupon.maxDiscount }, baseTotal),
  };
}

interface CheckoutProductRow {
  id: Id;
  name: string;
  images: string[] | string | null;
  price: number | string;
  priceTiers: unknown;
  countInStock: number;
}

async function loadProductForCheckout(conn: PoolConnection, productId: number, lockProducts: boolean) {
  const rows = await runQuery<CheckoutProductRow>(
    conn,
    `SELECT
       id,
       name,
       images,
       price,
       priceTiers,
       countInStock
     FROM Products
     WHERE id = :productId
     ${lockProducts ? "FOR UPDATE" : ""}`,
    { productId }
  );

  const row = rows[0];
  if (!row) {
    throw createHttpError(400, `Product ${productId} not found.`);
  }

  return {
    ...row,
    images: safeJsonParse(row.images || "[]", [] as string[]),
    price: Number(row.price || 0),
    priceTiers: safeJsonParse(row.priceTiers, [] as Array<{ minQty: number; price: number }>),
    countInStock: Number(row.countInStock || 0),
  };
}

interface CheckoutVariantRow {
  id: Id;
  productId: Id;
  name: string;
  sku: string | null;
  price: number | string;
  stock: number;
  isActive: number | boolean;
}

async function loadVariantForCheckout(
  conn: PoolConnection,
  productId: number,
  variantId: number | null,
  lockProducts: boolean
) {
  if (!variantId) return null;
  const rows = await runQuery<CheckoutVariantRow>(
    conn,
    `SELECT id, productId, name, sku, price, stock, isActive
       FROM ProductVariants
      WHERE id = :variantId
      ${lockProducts ? "FOR UPDATE" : ""}`,
    { variantId }
  );

  const row = rows[0];
  if (!row) {
    throw createHttpError(400, `Variant ${variantId} not found.`);
  }
  if (Number(row.productId) !== Number(productId)) {
    throw createHttpError(400, "Variant does not belong to this product.");
  }
  if (!row.isActive) {
    throw createHttpError(400, "This variant is no longer available.");
  }

  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    sku: row.sku || null,
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
  };
}

export interface CheckoutResult {
  userId: Id;
  addressId: number | null;
  shippingAddress: ShippingAddress;
  secureOrderItems: Array<OrderItem & { image: string }>;
  cartItemIds: number[];
  itemsPrice: number;
  shippingPrice: number;
  gstAmount: number;
  totalPrice: number;
  couponId: number | null;
  couponCode: string | null;
  couponDiscount: number;
  currency: "INR";
  walletDeduction?: number;
}

interface BuildCheckoutArgs {
  userId: Id;
  items: RawCheckoutItem[];
  addressId?: Id | null;
  shippingAddress?: RawAddressInput | null;
  couponCode?: string | null;
  conn: PoolConnection;
  lockProducts?: boolean;
}

export async function buildCheckoutFromItems({
  userId,
  items,
  addressId,
  shippingAddress,
  couponCode,
  conn,
  lockProducts = false,
}: BuildCheckoutArgs): Promise<CheckoutResult> {
  const normalizedItems = normalizeCheckoutItems(items);
  const [{ gstPercent, cartMilestones, minOrderValue }, resolvedShippingAddress] = await Promise.all([
    loadCheckoutSettings(conn),
    resolveShippingAddress({ userId, addressId, shippingAddress }),
  ]);

  const secureOrderItems: CheckoutResult["secureOrderItems"] = [];
  const cartItemIds: number[] = [];
  let itemsPrice = 0;

  for (const item of normalizedItems) {
    const product = await loadProductForCheckout(conn, item.productId, lockProducts);
    const variant = await loadVariantForCheckout(conn, item.productId, item.variantId, lockProducts);

    const effectiveStock = variant ? variant.stock : product.countInStock;
    if (effectiveStock < item.qty) {
      const label = variant ? `${product.name} (${variant.name})` : product.name;
      throw createHttpError(400, `Insufficient stock for "${label}". Only ${effectiveStock} left.`);
    }

    const effectivePrice = variant
      ? variant.price
      : resolveTierPrice(product.price, product.priceTiers, item.qty);
    const unitPrice = roundMoney(effectivePrice);
    itemsPrice += unitPrice * item.qty;
    secureOrderItems.push({
      productId: product.id,
      variantId: variant ? variant.id : null,
      variantName: variant ? variant.name : null,
      variantSku: variant ? variant.sku : null,
      name: product.name,
      image: product.images?.[0] || "",
      price: unitPrice,
      qty: item.qty,
    });
    cartItemIds.push(...item.cartItemIds);
  }

  itemsPrice = roundMoney(itemsPrice);

  const userRecord = await findUserById(userId);
  const isMember = Boolean(userRecord?.is_member);

  const MEMBER_MIN_ORDER = 499;
  const effectiveMinOrder = isMember ? MEMBER_MIN_ORDER : minOrderValue;
  if (effectiveMinOrder > 0 && itemsPrice < effectiveMinOrder) {
    throw createHttpError(400, `Minimum order value is ₹${effectiveMinOrder}. Your cart total is ₹${itemsPrice}.`);
  }

  const milestoneShippingFree = Array.isArray(cartMilestones)
    ? cartMilestones.some(
        (milestone) =>
          milestone &&
          milestone.type === "free_shipping" &&
          milestone.enabled !== false &&
          itemsPrice >= Number(milestone.amount || 0)
      )
    : false;
  const shippingPrice =
    isMember || itemsPrice >= DEFAULT_FREE_SHIPPING_THRESHOLD || milestoneShippingFree
      ? 0
      : DEFAULT_SHIPPING_COST;
  const gstAmount = roundMoney(itemsPrice * (gstPercent / 100));
  const baseTotal = roundMoney(itemsPrice + shippingPrice + gstAmount);
  const coupon = await validateCoupon({ couponCode, baseTotal, conn, userId });

  return {
    userId,
    addressId: addressId ? Number(addressId) : null,
    shippingAddress: resolvedShippingAddress,
    secureOrderItems,
    cartItemIds: [...new Set(cartItemIds)],
    itemsPrice,
    shippingPrice,
    gstAmount,
    totalPrice: roundMoney(baseTotal - coupon.couponDiscount),
    couponId: coupon.couponId,
    couponCode: coupon.couponCode,
    couponDiscount: coupon.couponDiscount,
    currency: "INR",
  };
}

interface BuildFromCartArgs {
  userId: Id;
  addressId?: Id | null;
  shippingAddress?: RawAddressInput | null;
  couponCode?: string | null;
  conn: PoolConnection;
  lockProducts?: boolean;
}

export async function buildCheckoutFromCart({ userId, addressId, shippingAddress, couponCode, conn, lockProducts = false }: BuildFromCartArgs) {
  const cartItems = await listCartLinesByUserId(userId, conn);
  const checkoutItems = (cartItems as Array<{ id: Id; productId: Id; variantId?: Id | null; quantity: number }>).map((item) => ({
    cartItemId: item.id,
    productId: item.productId,
    variantId: item.variantId ?? null,
    qty: item.quantity,
  }));

  return buildCheckoutFromItems({
    userId,
    items: checkoutItems,
    addressId,
    shippingAddress,
    couponCode,
    conn,
    lockProducts,
  });
}

async function decrementProductStock(conn: PoolConnection, productId: Id, qty: number) {
  const result = await runExecute(
    conn,
    `UPDATE Products
     SET countInStock = countInStock - :qty,
         purchaseCount = purchaseCount + :qty,
         updatedAt = NOW()
     WHERE id = :productId AND countInStock >= :qty`,
    { productId, qty }
  );

  if (result.affectedRows === 0) {
    throw createHttpError(400, "Insufficient stock while finalizing the order.");
  }
}

async function decrementVariantStockTx(conn: PoolConnection, variantId: Id, qty: number) {
  const result = await runExecute(
    conn,
    `UPDATE ProductVariants
        SET stock = stock - :qty
      WHERE id = :variantId
        AND isActive = 1
        AND stock >= :qty`,
    { variantId, qty }
  );
  if (result.affectedRows === 0) {
    throw createHttpError(400, "Insufficient variant stock while finalizing the order.");
  }
}

async function decrementStockForLine(conn: PoolConnection, item: OrderItem) {
  if (item.variantId) {
    await decrementVariantStockTx(conn, item.variantId, item.qty);
    await runExecute(
      conn,
      `UPDATE Products SET purchaseCount = purchaseCount + :qty, updatedAt = NOW() WHERE id = :productId`,
      { productId: item.productId, qty: item.qty }
    );
  } else {
    await decrementProductStock(conn, item.productId, item.qty);
  }
}

interface CreateOrderFromCheckoutArgs {
  userId: Id;
  checkout: CheckoutResult;
  paymentMethod: string;
  paymentResult?: Record<string, unknown>;
  isPaid?: boolean;
  paidAt?: Date | string | null;
  idempotencyKey?: string | null;
  conn: PoolConnection;
}

export async function createOrderFromCheckout({
  userId,
  checkout,
  paymentMethod,
  paymentResult = {},
  isPaid = false,
  paidAt = null,
  idempotencyKey = null,
  conn,
}: CreateOrderFromCheckoutArgs) {
  if (!checkout?.secureOrderItems?.length) {
    throw createHttpError(400, "No order items.");
  }

  if (idempotencyKey) {
    const existing = await findOrderByIdempotencyKey(idempotencyKey, conn);
    if (existing) return existing;
  }

  for (const item of checkout.secureOrderItems) {
    await decrementStockForLine(conn, item);
  }

  const order = await createOrder(
    {
      userId,
      items: checkout.secureOrderItems,
      shippingAddress: checkout.shippingAddress,
      paymentMethod,
      paymentResult: {
        ...(paymentResult || {}),
        ...(checkout.couponCode
          ? {
              couponCode: checkout.couponCode,
              couponDiscount: checkout.couponDiscount,
            }
          : {}),
      },
      idempotencyKey: idempotencyKey || null,
      itemsPrice: roundMoney(checkout.itemsPrice),
      shippingPrice: roundMoney(checkout.shippingPrice),
      gstAmount: roundMoney(checkout.gstAmount),
      totalPrice: roundMoney(checkout.totalPrice),
      isPaid: isPaid === true,
      paidAt: isPaid ? (paidAt as Date | string | null) || new Date() : null,
      status: "pending",
    } as never,
    conn
  );

  await createOrderItems(order!.id, checkout.secureOrderItems, conn);

  if (checkout.couponId) {
    await incrementCouponUsage(checkout.couponId, conn);
  }

  if (Array.isArray(checkout.cartItemIds) && checkout.cartItemIds.length > 0) {
    await deleteCartItemsByIds(userId, checkout.cartItemIds, conn);
  }

  await ensureInvoiceNumber(order, { conn, paidAt: order!.paidAt });

  return findOrderById(order!.id, conn);
}

const VALID_BULK_STATUSES = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);

export async function bulkSetOrderStatus({
  ids,
  status,
}: { ids: Array<Id | string | number>; status: string }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No order IDs provided");
  }
  if (!VALID_BULK_STATUSES.has(status)) {
    throw new HttpError(400, "Invalid status");
  }
  const affected = await bulkUpdateOrderStatus(ids, status as OrderStatus);
  return {
    success: true as const,
    error: false as const,
    message: `Updated ${affected} order${affected === 1 ? "" : "s"} to ${status}.`,
    affected,
    status,
  };
}

async function checkLowStockAlerts(order: { items?: OrderItem[] | string }) {
  const items = Array.isArray(order?.items) ? order.items : [];
  for (const item of items) {
    const productId = Number(item?.productId);
    const qty = Number(item?.qty || 0);
    if (!productId || qty <= 0) continue;
    try {
      const product = await findProductByIdRepo(productId);
      if (!product) continue;
      const currentStock = Number(product.countInStock || 0);
      const threshold = Number(product.reorderThreshold ?? 5);
      const previousStock = currentStock + qty;
      if (previousStock > threshold && currentStock <= threshold) {
        await sendLowStockAlertEmail(product);
      }
    } catch {
      // Per-item failure must not block the rest.
    }
  }
}

export async function creditReferralIfFirstOrder(userId: Id, orderId: Id) {
  try {
    const referral = await getReferralByReferee(userId);
    if (!referral || referral.credited) return;
    await creditWallet(referral.referrerId, 50);
    await markReferralCredited(userId, orderId);
  } catch {
    // non-critical
  }
}

export async function notifyOrderConfirmation(userId: Id, order: { id: Id; totalPrice: number | string; shippingAddress?: { phone?: string } }) {
  const user = await findUserById(userId);
  await sendOrderConfirmationEmail(order, user);
  sendNewOrderAdminEmail(order, user).catch(() => null);
  checkLowStockAlerts(order as { items?: OrderItem[] | string }).catch(() => null);
  const phone = user?.mobile || (user as { phone?: string })?.phone || order?.shippingAddress?.phone;
  sendOrderPlacedSms(phone, order.id, order.totalPrice).catch(() => null);
  sendOrderPlacedWhatsApp(phone, user?.name, order.id, order.totalPrice).catch(() => null);
  sendPushToUser(userId, {
    title: "Order Confirmed! 🎉",
    body: `Order #${order.id} for ₹${order.totalPrice} is confirmed.`,
    url: "/my-orders",
  }).catch(() => null);
  import("../repositories/abandoned-cart.js")
    .then(({ markRecovered }) => markRecovered(userId).catch(() => null))
    .catch(() => null);
}

interface CreateCodOrderBody {
  paymentMethod?: string;
  items?: RawCheckoutItem[];
  addressId?: Id;
  shippingAddress?: RawAddressInput;
  couponCode?: string;
  walletDeduction?: number | string;
}

export async function createCodOrder(userId: Id, body: CreateCodOrderBody | null | undefined) {
  const paymentMethod = body?.paymentMethod || "COD";
  if (paymentMethod !== "COD") {
    throw new HttpError(400, "Online payments must be completed through the payment verification endpoint.");
  }

  const conn = await getMysqlPool().getConnection();
  try {
    await conn.beginTransaction();
    const checkout =
      Array.isArray(body?.items) && body.items.length > 0
        ? await buildCheckoutFromItems({
            userId,
            items: body.items,
            addressId: body.addressId,
            shippingAddress: body.shippingAddress,
            couponCode: body.couponCode,
            conn,
            lockProducts: true,
          })
        : await buildCheckoutFromCart({
            userId,
            addressId: body?.addressId,
            shippingAddress: body?.shippingAddress,
            couponCode: body?.couponCode,
            conn,
            lockProducts: true,
          });

    const walletDeduction = Math.min(
      Math.max(0, Number(body?.walletDeduction) || 0),
      checkout.totalPrice
    );
    if (walletDeduction > 0) {
      await creditWallet(userId, -walletDeduction, conn);
      checkout.totalPrice = roundMoney(checkout.totalPrice - walletDeduction);
      checkout.walletDeduction = walletDeduction;
    }

    const order = await createOrderFromCheckout({ userId, checkout, paymentMethod: "COD", conn });
    await conn.commit();
    await notifyOrderConfirmation(userId, order as { id: Id; totalPrice: number | string });
    creditReferralIfFirstOrder(userId, order!.id).catch(() => null);

    return {
      order,
      message: "Order created successfully",
      success: true as const,
      error: false as const,
    };
  } catch (error) {
    await conn.rollback();
    if ((error as ErrorWithStatus).status) {
      throw new HttpError((error as ErrorWithStatus).status, (error as Error).message);
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function getUserOrders(userId: Id) {
  return {
    orders: await listOrdersByUserId(userId),
    message: "Orders fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getOrderByIdForUser(userId: Id, id: Id) {
  const order = await findOrderById(id);
  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  if (order.userId !== Number(userId)) {
    const user = await findUserById(userId);
    if (!user || user.role !== "admin") {
      throw new HttpError(403, "Access denied");
    }
  }

  return {
    order,
    message: "Order fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getAllOrdersForRoute(params: { page?: number; perPage?: number; status?: string }) {
  return {
    ...(await listAllOrders(params)),
    message: "All orders fetched",
    success: true as const,
    error: false as const,
  };
}

export async function updateOrderStatus(
  id: Id,
  status: string,
  trackingNumber: string | null = null,
  courierName: string | null = null,
  trackingUrl: string | null = null
) {
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new HttpError(400, "Invalid status value");
  }

  if (trackingUrl) {
    const trimmed = String(trackingUrl).trim();
    if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 500) {
      throw new HttpError(400, "Tracking URL must start with http:// or https:// and be under 500 chars.");
    }
    trackingUrl = trimmed;
  }

  const existing = await findOrderById(id);
  if (!existing) {
    throw new HttpError(404, "Order not found");
  }

  await updateOrderStatusRepo(id, status as OrderStatus, trackingNumber, courierName, trackingUrl);
  const updatedOrder = await findOrderById(id);

  const resolvedTrackingUrl = resolveTrackingUrl({
    trackingUrl: updatedOrder?.trackingUrl,
    courierName: updatedOrder?.courierName,
    trackingNumber: updatedOrder?.trackingNumber,
  });

  findUserById(existing.userId).then((user) => {
    sendOrderStatusEmail(updatedOrder, user, status, { trackingUrl: resolvedTrackingUrl }).catch(() => null);
    const phone = user?.mobile || (user as { phone?: string })?.phone || (updatedOrder?.shippingAddress as { phone?: string })?.phone;
    if (status === "shipped") {
      sendOrderShippedSms(phone, id, trackingNumber, courierName, resolvedTrackingUrl).catch(() => null);
      sendOrderShippedWhatsApp(phone, user?.name, id, trackingNumber, courierName, resolvedTrackingUrl).catch(() => null);
      sendPushToUser(existing.userId, {
        title: "Order Shipped 📦",
        body: `Order #${id} is on its way!`,
        url: resolvedTrackingUrl || "/my-orders",
      }).catch(() => null);
    } else if (status === "delivered") {
      sendOrderDeliveredSms(phone, id).catch(() => null);
      sendOrderDeliveredWhatsApp(phone, user?.name, id).catch(() => null);
      sendPushToUser(existing.userId, { title: "Order Delivered ✅", body: `Order #${id} has been delivered. Enjoy!`, url: "/my-orders" }).catch(() => null);
    }
  }).catch(() => null);

  return {
    order: updatedOrder,
    message: "Order status updated",
    success: true as const,
    error: false as const,
  };
}

export async function restoreStockForOrder(items: OrderItem[] | unknown, conn: PoolConnection) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const productId = Number(item?.productId);
    const qty = Number(item?.qty);
    if (!productId || !qty || qty <= 0) continue;
    const variantId = Number(item?.variantId);
    if (variantId) {
      await runExecute(
        conn,
        `UPDATE ProductVariants
            SET stock = stock + :qty
          WHERE id = :variantId`,
        { variantId, qty }
      );
    } else {
      await runExecute(
        conn,
        `UPDATE Products
            SET countInStock = countInStock + :qty,
                updatedAt    = NOW()
          WHERE id = :productId`,
        { productId, qty }
      );
    }
  }
}

const CANCELLABLE_STATUSES = new Set(["pending", "processing"]);

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(value as string) as T;
  } catch {
    return fallback;
  }
}

interface CancelOrderArgs {
  orderId: Id;
  userId: Id;
  reason: string;
  by?: "user" | "admin";
}

interface CancelOrderRow {
  id: Id;
  userId: Id;
  status: string;
  isPaid: number | boolean;
  paymentMethod: string;
  totalPrice: number | string;
  items: string | OrderItem[];
  paymentResult: string | { id?: string };
}

export async function cancelOrder({ orderId, userId, reason, by = "user" }: CancelOrderArgs) {
  const conn = await getMysqlPool().getConnection();
  try {
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT id, userId, status, isPaid, paymentMethod, totalPrice, items, paymentResult
         FROM Orders WHERE id = :orderId LIMIT 1 FOR UPDATE`,
      { orderId } as unknown as never
    );
    const order = (orderRows as CancelOrderRow[])[0];
    if (!order) {
      throw new HttpError(404, "Order not found");
    }

    if (by === "user" && Number(order.userId) !== Number(userId)) {
      throw new HttpError(403, "You cannot cancel this order");
    }

    if (!CANCELLABLE_STATUSES.has(order.status)) {
      throw new HttpError(
        400,
        `Order in status "${order.status}" cannot be cancelled.`
      );
    }

    const items = parseJsonField<OrderItem[]>(order.items, []);
    await restoreStockForOrder(items, conn);
    await markOrderCancelled(orderId, { reason, by }, conn);

    const paymentResult = parseJsonField<{ id?: string }>(order.paymentResult, {});

    await conn.commit();

    return {
      id: orderId,
      cancelled: true as const,
      requiresRefund: Boolean(order.isPaid) && order.paymentMethod !== "COD",
      paymentMethod: order.paymentMethod,
      totalPrice: Number(order.totalPrice || 0),
      razorpayPaymentId: paymentResult.id || null,
      userId: order.userId,
    };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    conn.release();
  }
}

async function runQuery<T = unknown>(conn: PoolConnection, sql: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const [rows] = await conn.query(sql, params as unknown as never);
  return rows as T[];
}

async function runExecute(conn: PoolConnection, sql: string, params: Record<string, unknown> = {}) {
  const [result] = await conn.execute(sql, params as unknown as never);
  return result as { affectedRows: number; insertId: number };
}

export { findPaidOrderByPaymentId };
