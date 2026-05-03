import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type {
  Coupon,
  CouponRestrictionType,
  CouponRow,
  CouponType,
  Id,
} from "../types.js";

const COUPON_SELECT = `
  id,
  code,
  description,
  type,
  value,
  minOrderValue,
  maxDiscount,
  usageLimit,
  usageCount,
  isActive,
  expiresAt,
  restrictionType,
  restrictedEmail,
  createdAt,
  updatedAt
`;

type CouponDbRow = CouponRow & RowDataPacket;

interface MappedCoupon extends Coupon {
  _id: Id;
}

function mapCoupon(row: CouponDbRow | undefined): MappedCoupon | null {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    type: row.type as CouponType,
    value: Number(row.value || 0),
    minOrderValue: Number(row.minOrderValue || 0),
    maxDiscount: row.maxDiscount == null ? null : Number(row.maxDiscount),
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    usageCount: Number(row.usageCount || 0),
    isActive: Boolean(row.isActive),
    restrictionType: (row.restrictionType || "none") as CouponRestrictionType,
    restrictedEmail: row.restrictedEmail || null,
  };
}

export async function listCoupons(): Promise<MappedCoupon[]> {
  const rows = await query<CouponDbRow>(
    `SELECT ${COUPON_SELECT}
     FROM Coupons
     ORDER BY createdAt DESC`
  );

  return rows.map((r) => mapCoupon(r) as MappedCoupon);
}

export async function findCouponById(
  id: Id,
  conn: PoolConnection | null = null
): Promise<MappedCoupon | null> {
  const rows = await runQuery<CouponDbRow>(
    conn,
    `SELECT ${COUPON_SELECT}
     FROM Coupons
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapCoupon(rows[0]);
}

export async function findCouponByCode(
  code: string,
  conn: PoolConnection | null = null
): Promise<MappedCoupon | null> {
  const rows = await runQuery<CouponDbRow>(
    conn,
    `SELECT ${COUPON_SELECT}
     FROM Coupons
     WHERE code = :code
     LIMIT 1`,
    { code }
  );

  return mapCoupon(rows[0]);
}

export interface CreateCouponPayload {
  code: string;
  description?: string | null;
  type: CouponType | string;
  value: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  isActive?: boolean;
  expiresAt?: string | Date | null;
  restrictionType?: CouponRestrictionType | string | null;
  restrictedEmail?: string | null;
}

export async function createCoupon(
  payload: CreateCouponPayload
): Promise<MappedCoupon | null> {
  const result = await execute(
    `INSERT INTO Coupons (
      code,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      usageCount,
      isActive,
      expiresAt,
      restrictionType,
      restrictedEmail,
      createdAt,
      updatedAt
    ) VALUES (
      :code,
      :description,
      :type,
      :value,
      :minOrderValue,
      :maxDiscount,
      :usageLimit,
      0,
      :isActive,
      :expiresAt,
      :restrictionType,
      :restrictedEmail,
      NOW(),
      NOW()
    )`,
    {
      ...(payload as unknown as Record<string, unknown>),
      isActive: payload.isActive ? 1 : 0,
    }
  );

  return findCouponById(result.insertId);
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export async function updateCoupon(
  id: Id,
  payload: UpdateCouponPayload
): Promise<MappedCoupon | null> {
  const serialized: Record<string, unknown> = {
    ...payload,
    isActive:
      payload.isActive === undefined ? undefined : payload.isActive ? 1 : 0,
  };
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return findCouponById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Coupons
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findCouponById(id);
}

export async function deleteCoupon(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Coupons
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function incrementCouponUsage(
  id: Id,
  conn: PoolConnection | null = null
): Promise<void> {
  await runExecute(
    conn,
    `UPDATE Coupons
     SET usageCount = usageCount + 1, updatedAt = NOW()
     WHERE id = :id`,
    { id }
  );
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
