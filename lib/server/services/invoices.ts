import type { PoolConnection } from "mysql2/promise";
import { execute } from "../db/mysql.js";
import { nextCounter } from "../repositories/counters.js";
import type { Order, SqlDateTime } from "../types.js";

const INVOICE_PREFIX = process.env.INVOICE_PREFIX || "INV";

/**
 * Indian fiscal year for a given date:
 *   Jan–Mar → previous calendar year is FY start (e.g. 2026-01-15 → "2025-26")
 *   Apr–Dec → current calendar year is FY start (e.g. 2026-04-15 → "2026-27")
 */
export function fiscalYearForDate(d: SqlDateTime | number = new Date()): string {
  const date = d instanceof Date ? d : new Date(d as string | number);
  const m = date.getMonth();
  const y = date.getFullYear();
  const startYear = m >= 3 ? y : y - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

export function formatInvoiceNumber(
  fy: string,
  seq: number,
  prefix: string = INVOICE_PREFIX
): string {
  return `${prefix}/${fy}/${String(seq).padStart(5, "0")}`;
}

type OrderLike = Pick<Order, "id" | "invoiceNumber" | "paidAt" | "createdAt">;

/**
 * Allocate and persist an invoice number for an order. Idempotent: if the
 * order already has one, returns it without re-allocating.
 *
 * Pass `conn` to keep the counter increment + UPDATE in the caller's
 * transaction.
 */
export async function ensureInvoiceNumber(
  order: OrderLike | null | undefined,
  {
    conn = null,
    paidAt = null,
  }: { conn?: PoolConnection | null; paidAt?: SqlDateTime | null } = {}
): Promise<string | null> {
  if (!order?.id) return null;
  if (order.invoiceNumber) return order.invoiceNumber;

  const issueDate = paidAt || order.paidAt || order.createdAt || new Date();
  const fy = fiscalYearForDate(issueDate);
  const seq = await nextCounter("invoice", fy, conn);
  const number = formatInvoiceNumber(fy, seq);

  const params = { id: order.id, number };
  const sql = `UPDATE Orders SET invoiceNumber = :number, updatedAt = NOW()
        WHERE id = :id AND invoiceNumber IS NULL`;

  if (conn) {
    await conn.execute(sql, params as unknown as never);
  } else {
    await execute(sql, params);
  }

  return number;
}
