import Razorpay from "razorpay";
import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../lib/server/auth/session.js";
import { creditWallet, findUserById } from "../../../lib/server/repositories/users.js";
import { execute, query } from "../../../lib/server/db/mysql.js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function ensureTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS WalletTopups (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      userId        INT NOT NULL,
      razorpayOrderId VARCHAR(100) NOT NULL,
      razorpayPaymentId VARCHAR(100) DEFAULT NULL,
      amount        DECIMAL(10,2) NOT NULL,
      status        ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
      createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/* POST /api/wallet — create Razorpay order for wallet top-up */
export async function POST(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    const { amount } = await request.json();
    const amt = Number(amount);
    if (!amt || amt < 10 || amt > 50000) return fail(400, "Amount must be between ₹10 and ₹50,000");

    await ensureTable();
    const order = await razorpay.orders.create({
      amount: Math.round(amt * 100),
      currency: "INR",
      notes: { userId, purpose: "wallet_topup" },
    });

    await execute(
      `INSERT INTO WalletTopups (userId, razorpayOrderId, amount) VALUES (:userId, :orderId, :amount)`,
      { userId, orderId: order.id, amount: amt }
    );

    return ok({ orderId: order.id, amount: amt, currency: "INR" });
  } catch (err) {
    return handleRouteError(err);
  }
}

/* PUT /api/wallet — verify payment and credit wallet */
export async function PUT(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) return fail(400, "Payment verification failed");

    await ensureTable();

    const rows = await query<{ amount: number | string } & import("mysql2").RowDataPacket>(
      `SELECT * FROM WalletTopups WHERE razorpayOrderId = :orderId AND userId = :userId AND status = 'pending' LIMIT 1`,
      { orderId: razorpay_order_id, userId }
    );
    if (!rows?.length) return fail(404, "Order not found");

    const topup = rows[0];
    await execute(
      `UPDATE WalletTopups SET status = 'paid', razorpayPaymentId = :paymentId WHERE razorpayOrderId = :orderId`,
      { paymentId: razorpay_payment_id, orderId: razorpay_order_id }
    );

    await creditWallet(userId, Number(topup.amount));
    const user = await findUserById(userId);

    return ok({ success: true, walletBalance: user?.walletBalance });
  } catch (err) {
    return handleRouteError(err);
  }
}
