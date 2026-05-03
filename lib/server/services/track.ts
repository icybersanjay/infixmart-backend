import { HttpError } from "../api/http.js";
import { findOrderById, findOrderItemsByOrderId } from "../repositories/orders.js";
import { findUserById } from "../repositories/users.js";
import type { Id } from "../types.js";

function normalizeContact(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

interface TrackOrderInput {
  orderId: Id | string;
  email?: string;
  phone?: string;
}

/**
 * Look up an order for public tracking. The combination of (orderId, email or
 * phone) acts as authentication — both must match what's on file.
 */
export async function trackOrder({ orderId, email, phone }: TrackOrderInput) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new HttpError(400, "Please enter a valid order id.");
  }
  if (!email && !phone) {
    throw new HttpError(400, "Enter the email or phone used at checkout.");
  }

  const order = await findOrderById(id);
  if (!order) {
    throw new HttpError(404, "We couldn't find that order. Check the id and the email/phone used at checkout.");
  }

  const inputEmail = normalizeContact(email);
  const inputPhone = normalizePhone(phone);

  const ship = order.shippingAddress || {};
  const shipPhone = normalizePhone((ship as { phone?: string; mobile?: string }).phone || (ship as { mobile?: string }).mobile);
  let user = null;
  if (order.userId) {
    user = await findUserById(order.userId);
  }
  const userEmail = normalizeContact(user?.email);
  const userPhone = normalizePhone(user?.mobile);

  const matchesEmail = inputEmail && inputEmail === userEmail;
  const matchesPhone =
    inputPhone &&
    inputPhone.length >= 6 &&
    (inputPhone === shipPhone || inputPhone === userPhone);

  if (!matchesEmail && !matchesPhone) {
    throw new HttpError(404, "We couldn't find that order. Check the id and the email/phone used at checkout.");
  }

  const items = await findOrderItemsByOrderId(id);
  const shipObj = ship as {
    townCity?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    postalCode?: string | null;
  };

  return {
    success: true as const,
    error: false as const,
    order: {
      id: order.id,
      status: order.status,
      isPaid: Boolean(order.isPaid),
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt || null,
      itemsPrice: Number(order.itemsPrice || 0),
      shippingPrice: Number(order.shippingPrice || 0),
      gstAmount: Number(order.gstAmount || 0),
      totalPrice: Number(order.totalPrice || 0),
      trackingNumber: order.trackingNumber || null,
      courierName: order.courierName || null,
      trackingUrl: order.trackingUrl || null,
      cancelledAt: order.cancelledAt || null,
      cancelReason: order.cancelReason || null,
      createdAt: order.createdAt,
      shipping: {
        city: shipObj.townCity || shipObj.city || null,
        state: shipObj.state || null,
        pincode: shipObj.pincode || shipObj.postalCode || null,
      },
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name,
        image: it.image,
        price: it.price,
        qty: it.qty,
      })),
    },
  };
}
