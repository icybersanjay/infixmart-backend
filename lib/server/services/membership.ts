import crypto from "crypto";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import { findUserById, updateUserById } from "../repositories/users.js";
import { listSettings } from "../repositories/settings.js";
import type { Id } from "../types.js";

async function getMembershipPrice(): Promise<number> {
  const settings = await listSettings();
  return Math.max(1, Number(settings.membership_price) || 49);
}

const PAYMENT_STATE_SECRET =
  process.env.PAYMENT_STATE_SECRET ||
  process.env.JWT_SECRET_ACCESS_TOKEN ||
  process.env.JWT_SECRET ||
  "";

interface ErrorWithStatus extends Error {
  status?: number;
}

function createError(status: number, message: string): ErrorWithStatus {
  return Object.assign(new Error(message), { status });
}

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw createError(500, "Razorpay is not configured.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export interface MembershipOrderResult {
  orderId: string;
  amount: number | string;
  currency: "INR";
  membershipToken: string;
}

export async function createMembershipPaymentOrder(
  userId: Id
): Promise<MembershipOrderResult> {
  const user = await findUserById(userId);
  if (!user) throw createError(404, "User not found.");
  if (user.is_member) throw createError(400, "You already have an active InfixPass membership.");

  const price = await getMembershipPrice();
  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: price * 100,
    currency: "INR",
    receipt: `mbrship_${userId}_${Date.now()}`.slice(0, 40),
    notes: { userId: String(userId), type: "membership" },
  });

  const membershipToken = jwt.sign(
    { userId, razorpayOrderId: order.id, type: "membership" },
    PAYMENT_STATE_SECRET,
    { expiresIn: "30m" }
  );

  return {
    orderId: order.id,
    amount: order.amount,
    currency: "INR",
    membershipToken,
  };
}

interface VerifyMembershipBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  membershipToken?: string;
}

interface MembershipState {
  userId: Id;
  razorpayOrderId: string;
  type: string;
}

export async function verifyMembershipPayment(
  userId: Id,
  body: VerifyMembershipBody | null | undefined
) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, membershipToken } =
    body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw createError(400, "Incomplete payment response.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const receivedBuffer = Buffer.from(String(razorpay_signature), "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const sigValid =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!sigValid) {
    throw createError(400, "Payment verification failed. Contact support.");
  }

  let state: MembershipState;
  try {
    state = jwt.verify(membershipToken || "", PAYMENT_STATE_SECRET) as MembershipState;
  } catch {
    throw createError(400, "Membership session expired. Please try again.");
  }

  if (
    state.type !== "membership" ||
    String(state.userId) !== String(userId) ||
    state.razorpayOrderId !== razorpay_order_id
  ) {
    throw createError(400, "Invalid membership session.");
  }

  const user = await findUserById(userId);
  if (user?.is_member) {
    return { success: true, alreadyMember: true };
  }

  await updateUserById(userId, {
    is_member: 1,
    membership_started_at: new Date(),
  });

  return { success: true };
}

export async function revokeMembership(userId: Id) {
  const user = await findUserById(userId);
  if (!user) throw createError(404, "User not found.");

  await updateUserById(userId, {
    is_member: 0,
    rto_count: (user.rto_count || 0) + 1,
  });

  return { success: true };
}

export async function getMembershipStatus(userId: Id) {
  const user = await findUserById(userId);
  if (!user) throw createError(404, "User not found.");

  return {
    isMember: user.is_member,
    memberSince: user.membership_started_at || null,
    rtoCount: user.rto_count,
  };
}
