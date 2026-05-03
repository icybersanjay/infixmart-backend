import crypto from "crypto";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import { HttpError } from "../api/http.js";
import { getMysqlPool } from "../db/mysql.js";
import {
  buildCheckoutFromCart,
  createHttpError,
  createOrderFromCheckout,
  creditReferralIfFirstOrder,
  findPaidOrderByPaymentId,
  notifyOrderConfirmation,
  roundMoney,
} from "./orders.js";
import { creditWallet } from "../repositories/users.js";
import type { Id } from "../types.js";

const PAYMENT_STATE_SECRET =
  process.env.PAYMENT_STATE_SECRET ||
  process.env.JWT_SECRET_ACCESS_TOKEN ||
  process.env.JWT_SECRET ||
  "";

export function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw createHttpError(500, "Razorpay is not configured.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function signCheckoutState(payload: object): string {
  if (!PAYMENT_STATE_SECRET) {
    throw createHttpError(500, "Payment state secret is not configured.");
  }
  return jwt.sign(payload, PAYMENT_STATE_SECRET, { expiresIn: "30m" });
}

function verifyCheckoutState(token: string | undefined | null) {
  if (!token) {
    throw createHttpError(400, "Checkout session is missing. Please try again.");
  }
  if (!PAYMENT_STATE_SECRET) {
    throw createHttpError(500, "Payment state secret is not configured.");
  }
  try {
    return jwt.verify(token, PAYMENT_STATE_SECRET);
  } catch {
    throw createHttpError(400, "Checkout session expired. Please try again.");
  }
}

export function signaturesMatch(expectedSignature: string, receivedSignature: unknown): boolean {
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(String(receivedSignature || ""), "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

interface CreatePaymentBody {
  addressId?: Id;
  shippingAddress?: unknown;
  couponCode?: string;
  walletDeduction?: number | string;
}

export async function createPaymentOrder(userId: Id, body: CreatePaymentBody | null | undefined) {
  const razorpay = getRazorpayClient();
  const conn = await getMysqlPool().getConnection();

  try {
    const checkout = await buildCheckoutFromCart({
      userId,
      addressId: body?.addressId,
      shippingAddress: body?.shippingAddress as never,
      couponCode: body?.couponCode,
      conn,
      lockProducts: false,
    });

    const walletDeduction = Math.min(
      Math.max(0, Number(body?.walletDeduction) || 0),
      checkout.totalPrice
    );
    if (walletDeduction > 0) {
      checkout.totalPrice = roundMoney(checkout.totalPrice - walletDeduction);
      checkout.walletDeduction = walletDeduction;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(checkout.totalPrice * 100),
      currency: checkout.currency,
      receipt: `rcpt_${userId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId: String(userId),
        couponCode: checkout.couponCode || "",
      },
    });

    const checkoutToken = signCheckoutState({
      type: "razorpay_checkout",
      userId,
      razorpayOrderId: order.id,
      createdAt: new Date().toISOString(),
      checkout,
    });

    return {
      error: false as const,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      checkoutToken,
      totals: {
        itemsPrice: checkout.itemsPrice,
        shippingPrice: checkout.shippingPrice,
        gstAmount: checkout.gstAmount,
        totalPrice: checkout.totalPrice,
        couponDiscount: checkout.couponDiscount,
      },
    };
  } finally {
    conn.release();
  }
}

interface VerifyPaymentBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  checkoutToken?: string;
}

interface CheckoutState {
  type: string;
  userId: Id;
  razorpayOrderId: string;
  checkout: {
    totalPrice: number;
    currency: string;
    walletDeduction?: number;
  };
}

interface LockRow {
  lockStatus: number | string;
}

export async function verifyPayment(userId: Id, body: VerifyPaymentBody | null | undefined) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, checkoutToken } = body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !checkoutToken) {
    throw new HttpError(400, "Missing payment verification fields");
  }

  const checkoutState = verifyCheckoutState(checkoutToken) as CheckoutState;
  if (checkoutState.type !== "razorpay_checkout" || Number(checkoutState.userId) !== Number(userId)) {
    throw new HttpError(403, "Checkout session does not belong to this user.");
  }

  if (checkoutState.razorpayOrderId !== razorpay_order_id) {
    throw new HttpError(400, "Checkout session does not match the payment order.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expectedSignature, razorpay_signature)) {
    throw new HttpError(400, "Payment verification failed");
  }

  const razorpay = getRazorpayClient();
  const payment = await razorpay.payments.fetch(razorpay_payment_id);
  const expectedAmount = Math.round(Number(checkoutState.checkout.totalPrice || 0) * 100);
  const paymentCaptured = payment?.captured === true || payment?.status === "captured";

  if (!payment || payment.order_id !== razorpay_order_id) {
    throw new HttpError(400, "Payment order mismatch detected.");
  }

  if (Number(payment.amount) !== expectedAmount || payment.currency !== checkoutState.checkout.currency) {
    throw new HttpError(400, "Paid amount does not match the verified checkout total.");
  }

  if (!paymentCaptured) {
    throw new HttpError(400, "Payment is not captured yet. Enable auto-capture in Razorpay before going live.");
  }

  const conn = await getMysqlPool().getConnection();
  const lockKey = `rzp_payment_${razorpay_payment_id}`.slice(0, 64);
  let lockAcquired = false;

  try {
    await conn.beginTransaction();
    const [lockRows] = await conn.query(
      "SELECT GET_LOCK(:lockKey, 10) AS lockStatus",
      { lockKey } as unknown as never
    );
    const lockArray = lockRows as unknown as LockRow[];
    lockAcquired = Number(lockArray?.[0]?.lockStatus) === 1;

    if (!lockAcquired) {
      throw new HttpError(409, "This payment is already being processed. Please refresh in a moment.");
    }

    const existingOrder = await findPaidOrderByPaymentId(razorpay_payment_id, conn);
    if (existingOrder) {
      throw new HttpError(409, "This payment has already been used.");
    }

    // orders.js exports a JSDoc-typed createOrderFromCheckout — cast the
    // call site so TS doesn't infer the optional defaults as `null|undefined`.
    const order = await (createOrderFromCheckout as unknown as (args: unknown) => Promise<{ id: number }>)({
      userId,
      checkout: checkoutState.checkout,
      paymentMethod: "Razorpay",
      paymentResult: {
        id: razorpay_payment_id,
        status: payment.status || "captured",
        razorpay_order_id,
        razorpay_signature,
        amount: roundMoney(Number(payment.amount || 0) / 100),
        currency: payment.currency,
        method: payment.method || null,
      },
      idempotencyKey: razorpay_payment_id,
      isPaid: true,
      paidAt: payment.created_at ? new Date(Number(payment.created_at) * 1000) : new Date(),
      conn,
    });

    if (lockAcquired) {
      await conn.query("SELECT RELEASE_LOCK(:lockKey) AS released", { lockKey } as unknown as never);
      lockAcquired = false;
    }

    const walletDeduction = Number(checkoutState.checkout.walletDeduction) || 0;
    if (walletDeduction > 0) {
      await creditWallet(userId, -walletDeduction, conn);
    }

    await conn.commit();
    await notifyOrderConfirmation(userId, order as never);
    creditReferralIfFirstOrder(userId, order.id).catch(() => null);

    return {
      success: true as const,
      paymentId: razorpay_payment_id,
      order,
    };
  } catch (error) {
    if (lockAcquired) {
      try {
        await conn.query("SELECT RELEASE_LOCK(:lockKey) AS released", { lockKey } as unknown as never);
      } catch {}
    }
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
