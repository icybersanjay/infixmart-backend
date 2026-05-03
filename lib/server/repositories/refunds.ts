import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type { Id, Refund, RefundRow, RefundStatus } from "../types.js";

const REFUND_SELECT = `
  id, orderId, userId, amount, currency, razorpayPaymentId, razorpayRefundId,
  status, reason, requestedBy, requestedById, note, failureReason,
  createdAt, processedAt
`;

type RefundDbRow = RefundRow & RowDataPacket;

interface MappedRefund extends Omit<Refund, "amount"> {
  amount: number;
}

function mapRefund(row: RefundDbRow | undefined): MappedRefund | null {
  if (!row) return null;
  return {
    ...row,
    amount: Number(row.amount || 0),
  };
}

export interface CreateRefundPayload {
  orderId: Id;
  userId: Id;
  amount: number;
  currency?: string;
  razorpayPaymentId?: string | null;
  razorpayRefundId?: string | null;
  status?: RefundStatus;
  reason?: string | null;
  requestedBy?: string;
  requestedById?: Id | null;
  note?: string | null;
}

export async function createRefund(
  payload: CreateRefundPayload,
  conn: PoolConnection | null = null
): Promise<MappedRefund | null> {
  const result = await runExecute(
    conn,
    `INSERT INTO Refunds (
      orderId,
      userId,
      amount,
      currency,
      razorpayPaymentId,
      razorpayRefundId,
      status,
      reason,
      requestedBy,
      requestedById,
      note
    ) VALUES (
      :orderId,
      :userId,
      :amount,
      :currency,
      :razorpayPaymentId,
      :razorpayRefundId,
      :status,
      :reason,
      :requestedBy,
      :requestedById,
      :note
    )`,
    {
      orderId: payload.orderId,
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency || "INR",
      razorpayPaymentId: payload.razorpayPaymentId || null,
      razorpayRefundId: payload.razorpayRefundId || null,
      status: payload.status || "pending",
      reason: payload.reason || null,
      requestedBy: payload.requestedBy || "admin",
      requestedById: payload.requestedById || null,
      note: payload.note || null,
    }
  );
  return findRefundById(result.insertId, conn);
}

export async function findRefundById(
  id: Id,
  conn: PoolConnection | null = null
): Promise<MappedRefund | null> {
  const rows = await runQuery<RefundDbRow>(
    conn,
    `SELECT ${REFUND_SELECT}
       FROM Refunds
      WHERE id = :id
      LIMIT 1`,
    { id }
  );
  return mapRefund(rows[0]);
}

export async function findRefundByRazorpayId(
  razorpayRefundId: string | null | undefined,
  conn: PoolConnection | null = null
): Promise<MappedRefund | null> {
  if (!razorpayRefundId) return null;
  const rows = await runQuery<RefundDbRow>(
    conn,
    `SELECT ${REFUND_SELECT}
       FROM Refunds
      WHERE razorpayRefundId = :razorpayRefundId
      LIMIT 1`,
    { razorpayRefundId }
  );
  return mapRefund(rows[0]);
}

export async function listRefundsByOrderId(orderId: Id): Promise<MappedRefund[]> {
  const rows = await query<RefundDbRow>(
    `SELECT ${REFUND_SELECT}
       FROM Refunds
      WHERE orderId = :orderId
      ORDER BY id DESC`,
    { orderId }
  );
  return rows.map((r) => mapRefund(r) as MappedRefund);
}

export interface UpdateRefundPayload {
  razorpayRefundId?: string | null;
  status?: RefundStatus;
  failureReason?: string | null;
  note?: string | null;
  processedAt?: Date | string | null;
}

export async function updateRefund(
  id: Id,
  updates: UpdateRefundPayload,
  conn: PoolConnection | null = null
): Promise<MappedRefund | null> {
  const allowed: (keyof UpdateRefundPayload)[] = [
    "razorpayRefundId",
    "status",
    "failureReason",
    "note",
    "processedAt",
  ];
  const entries = Object.entries(updates).filter(
    ([key, value]) =>
      allowed.includes(key as keyof UpdateRefundPayload) && value !== undefined
  );
  if (entries.length === 0) return findRefundById(id, conn);

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  const params = Object.fromEntries(entries);

  await runExecute(conn, `UPDATE Refunds SET ${setClause} WHERE id = :id`, {
    ...params,
    id,
  });

  return findRefundById(id, conn);
}

async function runQuery<T extends RowDataPacket>(
  conn: PoolConnection | null,
  sql: string,
  params: SqlParams = {}
): Promise<T[]> {
  if (conn) {
    const [rows] = await conn.query<T[]>(sql, params as unknown as never);
    return rows as T[];
  }
  return query<T>(sql, params);
}

async function runExecute(
  conn: PoolConnection | null,
  sql: string,
  params: SqlParams = {}
): Promise<ResultSetHeader> {
  if (conn) {
    const [result] = await conn.execute<ResultSetHeader>(sql, params as unknown as never);
    return result;
  }
  return execute(sql, params);
}
