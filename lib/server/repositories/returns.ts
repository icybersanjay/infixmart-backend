import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { DecimalString, Id, ReturnRow, ReturnStatus } from "../types.js";

interface ReturnJoinRow extends ReturnRow, RowDataPacket {
  userName?: string | null;
  userEmail?: string | null;
  orderTotalPrice?: DecimalString | number | null;
}

export interface MappedReturn extends ReturnRow {
  _id: Id;
  user?: { id: Id; name: string | null; email: string | null };
  order?: { id: Id; totalPrice: number | null };
}

function mapReturn(row: ReturnJoinRow | undefined): MappedReturn | null {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    user: row.userId
      ? { id: row.userId, name: row.userName || null, email: row.userEmail || null }
      : undefined,
    order: row.orderId
      ? {
          id: row.orderId,
          totalPrice:
            row.orderTotalPrice == null ? null : Number(row.orderTotalPrice),
        }
      : undefined,
  };
}

export interface CreateReturnRequestPayload {
  orderId: Id;
  userId: Id;
  reason: string;
}

export async function createReturnRequest(
  payload: CreateReturnRequestPayload
): Promise<MappedReturn | null> {
  const result = await execute(
    `INSERT INTO Returns (
      orderId,
      userId,
      reason,
      status,
      adminNote,
      createdAt,
      updatedAt
    ) VALUES (
      :orderId,
      :userId,
      :reason,
      'pending',
      NULL,
      NOW(),
      NOW()
    )`,
    payload as unknown as Record<string, unknown>
  );

  return findReturnById(result.insertId);
}

export async function findReturnById(id: Id): Promise<MappedReturn | null> {
  const rows = await query<ReturnJoinRow>(
    `SELECT
       r.id,
       r.orderId,
       r.userId,
       r.reason,
       r.status,
       r.adminNote,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.email AS userEmail,
       o.totalPrice AS orderTotalPrice
     FROM Returns r
     LEFT JOIN Users u ON u.id = r.userId
     LEFT JOIN Orders o ON o.id = r.orderId
     WHERE r.id = :id
     LIMIT 1`,
    { id }
  );

  return mapReturn(rows[0]);
}

export async function findActiveReturnForOrder(
  orderId: Id
): Promise<ReturnRow | null> {
  const rows = await query<ReturnRow & RowDataPacket>(
    `SELECT id, orderId, userId, reason, status, adminNote, createdAt, updatedAt
     FROM Returns
     WHERE orderId = :orderId AND status IN ('pending', 'approved')
     LIMIT 1`,
    { orderId }
  );

  return rows[0] || null;
}

export async function listReturnsByUserId(userId: Id): Promise<Array<MappedReturn | null>> {
  const rows = await query<ReturnJoinRow>(
    `SELECT
       r.id,
       r.orderId,
       r.userId,
       r.reason,
       r.status,
       r.adminNote,
       r.createdAt,
       r.updatedAt,
       o.totalPrice AS orderTotalPrice
     FROM Returns r
     LEFT JOIN Orders o ON o.id = r.orderId
     WHERE r.userId = :userId
     ORDER BY r.createdAt DESC`,
    { userId }
  );

  return rows.map(mapReturn);
}

export interface ListReturnsResult {
  data: Array<MappedReturn | null>;
  total: number;
  totalPages: number;
  currentPage: number;
}

export async function listReturns({
  page = 1,
  perPage = 20,
  status = "",
}: { page?: number; perPage?: number; status?: string }): Promise<ListReturnsResult> {
  const offset = (page - 1) * perPage;
  const whereClause = status ? "WHERE r.status = :status" : "";
  const params: Record<string, unknown> = status
    ? { status, limit: perPage, offset }
    : { limit: perPage, offset };

  const [countRows, rows] = await Promise.all([
    query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total
       FROM Returns r
       ${status ? "WHERE r.status = :status" : ""}`,
      status ? { status } : {}
    ),
    query<ReturnJoinRow>(
      `SELECT
         r.id,
         r.orderId,
         r.userId,
         r.reason,
         r.status,
         r.adminNote,
         r.createdAt,
         r.updatedAt,
         u.name AS userName,
         u.email AS userEmail,
         o.totalPrice AS orderTotalPrice
       FROM Returns r
       LEFT JOIN Users u ON u.id = r.userId
       LEFT JOIN Orders o ON o.id = r.orderId
       ${whereClause}
       ORDER BY r.createdAt DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
  ]);

  const total = Number(countRows[0]?.total || 0);
  return {
    data: rows.map(mapReturn),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    currentPage: page,
  };
}

export interface UpdateReturnStatusPayload {
  status?: ReturnStatus | string;
  adminNote?: string | null;
}

export async function updateReturnStatus(
  id: Id,
  payload: UpdateReturnStatusPayload
): Promise<MappedReturn | null> {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Returns
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findReturnById(id);
}
