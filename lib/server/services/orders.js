import { HttpError } from "../api/http.js";
import { getMysqlPool } from "../db/mysql.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "../email/order-confirmation.js";
import { findAddressByIdForUser } from "../repositories/addresses.js";
import { deleteCartItemsByIds, listCartLinesByUserId } from "../repositories/cart.js";
import { findCouponByCode, incrementCouponUsage } from "../repositories/coupons.js";
import { checkCouponRestrictions } from "./coupons.js";
import {
  createOrder,
  createOrderItems,
  findOrderById,
  findPaidOrderByPaymentId,
  listAllOrders,
  listOrdersByUserId,
  updateOrderStatus as updateOrderStatusRepo,
} from "../repositories/orders.js";
import { findUserById } from "../repositories/users.js";

const DEFAULT_FREE_SHIPPING_THRESHOLD = 999;
const DEFAULT_SHIPPING_COST = 49;

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeShippingAddressInput(shippingAddress) {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw createHttpError(400, "Delivery address is required.");
  }

  const normalized = {
    name: String(shippingAddress.name || "").trim(),
    phone: String(shippingAddress.phone || shippingAddress.mobile || "").trim(),
    address: String(shippingAddress.address || "").trim(),
    city: String(shippingAddress.city || shippingAddress.townCity || "").trim(),
    state: String(shippingAddress.state || "").trim(),
    postalCode: String(shippingAddress.postalCode || shippingAddress.pincode || "").trim(),
    country: String(shippingAddress.country || "India").trim() || "India",
  };

  if (!normalized.name || !normalized.phone || !normalized.address || !normalized.city || !normalized.state || !normalized.postalCode) {
    throw createHttpError(400, "Delivery address is incomplete.");
  }

  return normalized;
}

function mapAddressRecord(address) {
  return {
    name: address.name,
    phone: address.mobile,
    address: address.flatHouse + (address.areaStreet ? `, ${address.areaStreet}` : ""),
    city: address.townCity,
    state: address.state,
    postalCode: address.pincode,
    country: address.country || "India",
  };
}

function normalizeCheckoutItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw createHttpError(400, "Your cart is empty.");
  }

  const merged = new Map();
  for (const rawItem of items) {
    const productId = toPositiveInteger(rawItem?.product ?? rawItem?.productId);
    const qty = toPositiveInteger(rawItem?.qty ?? rawItem?.quantity);
    const cartItemId = toPositiveInteger(rawItem?.cartItemId ?? rawItem?.id);
    if (!productId || !qty) {
      throw createHttpError(400, "Invalid checkout item payload.");
    }

    const existing = merged.get(productId) || { productId, qty: 0, cartItemIds: [] };
    existing.qty += qty;
    if (cartItemId) existing.cartItemIds.push(cartItemId);
    merged.set(productId, existing);
  }

  return [...merged.values()];
}

async function loadCheckoutSettings(conn) {
  const rows = await runQuery(
    conn,
    `SELECT \`key\`, \`value\`
     FROM StoreSettings`
  );

  const map = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    gstPercent: Math.max(0, Number(map.gst_percent) || 0),
    cartMilestones: safeJsonParse(map.cart_milestones || "[]", []),
  };
}

function getCouponDiscount(coupon, total) {
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

async function resolveShippingAddress({ userId, addressId, shippingAddress }) {
  if (addressId) {
    const address = await findAddressByIdForUser(addressId, userId);
    if (!address) {
      throw createHttpError(400, "Selected address was not found.");
    }
    return mapAddressRecord(address);
  }

  return normalizeShippingAddressInput(shippingAddress);
}

async function validateCoupon({ couponCode, baseTotal, conn, userId = null }) {
  if (!couponCode) {
    return { couponId: null, couponCode: null, couponDiscount: 0 };
  }

  const coupon = await findCouponByCode(String(couponCode).toUpperCase().trim(), conn);
  if (!coupon || !coupon.isActive) {
    throw createHttpError(400, "Invalid or expired coupon code.");
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw createHttpError(400, "This coupon has expired.");
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw createHttpError(400, "This coupon has reached its usage limit.");
  }
  if (baseTotal < coupon.minOrderValue) {
    throw createHttpError(400, `Minimum order value ₹${coupon.minOrderValue} required for this coupon.`);
  }

  // Enforce per-user restrictions (first_order / email) at order creation time.
  await checkCouponRestrictions(coupon, userId, conn);

  return {
    couponId: coupon.id,
    couponCode: coupon.code,
    couponDiscount: getCouponDiscount(coupon, baseTotal),
  };
}

async function loadProductForCheckout(conn, productId, lockProducts) {
  const rows = await runQuery(
    conn,
    `SELECT
       id,
       name,
       images,
       price,
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
    images: safeJsonParse(row.images || "[]", []),
    price: Number(row.price || 0),
    countInStock: Number(row.countInStock || 0),
  };
}

async function buildCheckoutFromItems({ userId, items, addressId, shippingAddress, couponCode, conn, lockProducts = false }) {
  const normalizedItems = normalizeCheckoutItems(items);
  const [{ gstPercent, cartMilestones }, resolvedShippingAddress] = await Promise.all([
    loadCheckoutSettings(conn),
    resolveShippingAddress({ userId, addressId, shippingAddress }),
  ]);

  const secureOrderItems = [];
  const cartItemIds = [];
  let itemsPrice = 0;

  for (const item of normalizedItems) {
    const product = await loadProductForCheckout(conn, item.productId, lockProducts);
    if (product.countInStock < item.qty) {
      throw createHttpError(400, `Insufficient stock for "${product.name}". Only ${product.countInStock} left.`);
    }

    const unitPrice = roundMoney(product.price);
    itemsPrice += unitPrice * item.qty;
    secureOrderItems.push({
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || "",
      price: unitPrice,
      qty: item.qty,
    });
    cartItemIds.push(...item.cartItemIds);
  }

  itemsPrice = roundMoney(itemsPrice);
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
    itemsPrice >= DEFAULT_FREE_SHIPPING_THRESHOLD || milestoneShippingFree
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

async function buildCheckoutFromCart({ userId, addressId, shippingAddress, couponCode, conn, lockProducts = false }) {
  const cartItems = await listCartLinesByUserId(userId, conn);
  const checkoutItems = cartItems.map((item) => ({
    cartItemId: item.id,
    productId: item.productId,
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

async function decrementProductStock(conn, productId, qty) {
  const result = await runExecute(
    conn,
    `UPDATE Products
     SET countInStock = countInStock - :qty, updatedAt = NOW()
     WHERE id = :productId AND countInStock >= :qty`,
    { productId, qty }
  );

  if (result.affectedRows === 0) {
    throw createHttpError(400, "Insufficient stock while finalizing the order.");
  }
}

async function createOrderFromCheckout({ userId, checkout, paymentMethod, paymentResult = {}, isPaid = false, paidAt = null, conn }) {
  if (!checkout?.secureOrderItems?.length) {
    throw createHttpError(400, "No order items.");
  }

  for (const item of checkout.secureOrderItems) {
    await decrementProductStock(conn, item.productId, item.qty);
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
      itemsPrice: roundMoney(checkout.itemsPrice),
      shippingPrice: roundMoney(checkout.shippingPrice),
      gstAmount: roundMoney(checkout.gstAmount),
      totalPrice: roundMoney(checkout.totalPrice),
      isPaid: isPaid === true,
      paidAt: isPaid ? paidAt || new Date() : null,
      status: "pending",
    },
    conn
  );

  await createOrderItems(order.id, checkout.secureOrderItems, conn);

  if (checkout.couponId) {
    await incrementCouponUsage(checkout.couponId, conn);
  }

  if (Array.isArray(checkout.cartItemIds) && checkout.cartItemIds.length > 0) {
    await deleteCartItemsByIds(userId, checkout.cartItemIds, conn);
  }

  return findOrderById(order.id, conn);
}

async function notifyOrderConfirmation(userId, order) {
  const user = await findUserById(userId);
  await sendOrderConfirmationEmail(order, user);
}

async function createCodOrder(userId, body) {
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
            addressId: body.addressId,
            shippingAddress: body.shippingAddress,
            couponCode: body.couponCode,
            conn,
            lockProducts: true,
          });

    const order = await createOrderFromCheckout({ userId, checkout, paymentMethod: "COD", conn });
    await conn.commit();
    await notifyOrderConfirmation(userId, order);

    return {
      order,
      message: "Order created successfully",
      success: true,
      error: false,
    };
  } catch (error) {
    await conn.rollback();
    if (error.status) {
      throw new HttpError(error.status, error.message);
    }
    throw error;
  } finally {
    conn.release();
  }
}

async function getUserOrders(userId) {
  return {
    orders: await listOrdersByUserId(userId),
    message: "Orders fetched successfully",
    success: true,
    error: false,
  };
}

async function getOrderByIdForUser(userId, id) {
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
    success: true,
    error: false,
  };
}

async function getAllOrdersForRoute(params) {
  return {
    ...(await listAllOrders(params)),
    message: "All orders fetched",
    success: true,
    error: false,
  };
}

async function updateOrderStatus(id, status) {
  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new HttpError(400, "Invalid status value");
  }

  const existing = await findOrderById(id);
  if (!existing) {
    throw new HttpError(404, "Order not found");
  }

  await updateOrderStatusRepo(id, status);
  const updatedOrder = await findOrderById(id);

  // Fire status notification email — don't await so it never blocks the response
  findUserById(existing.userId)
    .then((user) => sendOrderStatusEmail(updatedOrder, user, status))
    .catch((err) => console.error("[order-status-email]", err));

  return {
    order: updatedOrder,
    message: "Order status updated",
    success: true,
    error: false,
  };
}

async function runQuery(conn, sql, params = {}) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function runExecute(conn, sql, params = {}) {
  const [result] = await conn.execute(sql, params);
  return result;
}

export {
  buildCheckoutFromCart,
  buildCheckoutFromItems,
  createCodOrder,
  createHttpError,
  createOrderFromCheckout,
  findPaidOrderByPaymentId,
  getAllOrdersForRoute,
  getOrderByIdForUser,
  getUserOrders,
  notifyOrderConfirmation,
  roundMoney,
  updateOrderStatus,
};
