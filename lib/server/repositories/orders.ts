import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type {
  Id,
  Order,
  OrderItem,
  OrderRow,
  OrderStatus,
  PaymentResult,
  ShippingAddress,
} from "../types.js";

// Auto-heal: older databases were created before the post-delivery review
// reminder feature added `deliveredAt` and `reviewReminderSentAt`. Idempotent
// ALTER, ran once per process. Mirrors the pattern in repositories/products.ts.
let reviewSchemaEnsured = false;
async function ensureOrdersReviewSchema(): Promise<void> {
  if (reviewSchemaEnsured) return;
  try {
    await execute(
      `ALTER TABLE Orders
         ADD COLUMN IF NOT EXISTS deliveredAt           DATETIME NULL,
         ADD COLUMN IF NOT EXISTS reviewReminderSentAt  DATETIME NULL`,
      {}
    );
    reviewSchemaEnsured = true;
  } catch (err) {
    console.error(
      "[orders:ensureReviewSchema] failed to auto-add columns:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

// Auto-heal: add variantId/variantName/variantSku to OrderItems so the line
// items keep a permanent record of which variant was sold (the variant row
// itself can be edited or deleted later). Idempotent.
let orderItemsVariantSchemaEnsured = false;
async function ensureOrderItemsVariantSchema(): Promise<void> {
  if (orderItemsVariantSchemaEnsured) return;
  try {
    await execute(
      `ALTER TABLE OrderItems
         ADD COLUMN IF NOT EXISTS variantId   INT          NULL AFTER productId,
         ADD COLUMN IF NOT EXISTS variantName VARCHAR(255) NULL,
         ADD COLUMN IF NOT EXISTS variantSku  VARCHAR(100) NULL`,
      {}
    );
    orderItemsVariantSchemaEnsured = true;
  } catch (err) {
    console.error(
      "[orders:ensureOrderItemsVariantSchema] failed to auto-add columns:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

const ORDER_SELECT_COLUMNS = `
  id,
  userId,
  items,
  shippingAddress,
  paymentMethod,
  paymentResult,
  idempotencyKey,
  invoiceNumber,
  itemsPrice,
  shippingPrice,
  gstAmount,
  totalPrice,
  isPaid,
  paidAt,
  status,
  trackingNumber,
  courierName,
  trackingUrl,
  cancelledAt,
  cancelReason,
  cancelledBy,
  createdAt,
  updatedAt
`;

type OrderDbRow = OrderRow & RowDataPacket;

interface MappedOrder extends Order {
  _id: Id;
}

function mapOrder(row: OrderDbRow | undefined): MappedOrder | null {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    items: safeParseJson<OrderItem[]>(row.items, []),
    shippingAddress: safeParseJson<ShippingAddress>(row.shippingAddress, {}),
    paymentResult: safeParseJson<PaymentResult>(row.paymentResult, {}),
    itemsPrice: Number(row.itemsPrice || 0),
    shippingPrice: Number(row.shippingPrice || 0),
    gstAmount: Number(row.gstAmount || 0),
    totalPrice: Number(row.totalPrice || 0),
    isPaid: Boolean(row.isPaid),
    trackingNumber: row.trackingNumber || null,
    courierName: row.courierName || null,
    trackingUrl: row.trackingUrl || null,
    cancelledAt: row.cancelledAt || null,
    cancelReason: row.cancelReason || null,
    cancelledBy: row.cancelledBy || null,
    invoiceNumber: row.invoiceNumber || null,
  };
}

export interface CreateOrderPayload {
  userId: Id;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentResult?: PaymentResult;
  idempotencyKey?: string | null;
  itemsPrice: number;
  shippingPrice: number;
  gstAmount: number;
  totalPrice: number;
  isPaid?: boolean;
  paidAt?: Date | string | null;
  status?: OrderStatus | string;
}

export async function createOrder(
  payload: CreateOrderPayload,
  conn: PoolConnection | null = null
): Promise<MappedOrder | null> {
  const result = await runExecute(
    conn,
    `INSERT INTO Orders (
      userId,
      items,
      shippingAddress,
      paymentMethod,
      paymentResult,
      idempotencyKey,
      itemsPrice,
      shippingPrice,
      gstAmount,
      totalPrice,
      isPaid,
      paidAt,
      status,
      createdAt,
      updatedAt
    ) VALUES (
      :userId,
      :items,
      :shippingAddress,
      :paymentMethod,
      :paymentResult,
      :idempotencyKey,
      :itemsPrice,
      :shippingPrice,
      :gstAmount,
      :totalPrice,
      :isPaid,
      :paidAt,
      :status,
      NOW(),
      NOW()
    )`,
    {
      ...(payload as unknown as Record<string, unknown>),
      items: JSON.stringify(payload.items || []),
      shippingAddress: JSON.stringify(payload.shippingAddress || {}),
      paymentResult: JSON.stringify(payload.paymentResult || {}),
      idempotencyKey: payload.idempotencyKey || null,
      isPaid: payload.isPaid ? 1 : 0,
      paidAt: payload.paidAt || null,
      status: payload.status || "pending",
    }
  );

  return findOrderById(result.insertId, conn);
}

export async function createOrderItems(
  orderId: Id,
  items: (OrderItem & { variantId?: Id | null; variantName?: string | null; variantSku?: string | null })[],
  conn: PoolConnection | null = null
): Promise<void> {
  await ensureOrderItemsVariantSchema();
  for (const item of items) {
    await runExecute(
      conn,
      `INSERT INTO OrderItems (
        orderId,
        productId,
        variantId,
        variantName,
        variantSku,
        name,
        image,
        price,
        qty,
        createdAt,
        updatedAt
      ) VALUES (
        :orderId,
        :productId,
        :variantId,
        :variantName,
        :variantSku,
        :name,
        :image,
        :price,
        :qty,
        NOW(),
        NOW()
      )`,
      {
        orderId,
        productId: item.productId,
        variantId: item.variantId ?? null,
        variantName: item.variantName ?? null,
        variantSku: item.variantSku ?? null,
        name: item.name,
        image: item.image || "",
        price: item.price,
        qty: item.qty,
      }
    );
  }
}

interface OrderItemDbRow extends RowDataPacket {
  id: Id;
  orderId: Id;
  productId: Id;
  name: string;
  image: string | null;
  price: string | number;
  qty: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MappedOrderItem extends Omit<OrderItemDbRow, "price" | "qty"> {
  price: number;
  qty: number;
}

export async function findOrderItemsByOrderId(
  orderId: Id,
  conn: PoolConnection | null = null
): Promise<MappedOrderItem[]> {
  const rows = await runQuery<OrderItemDbRow>(
    conn,
    `SELECT id, orderId, productId, name, image, price, qty, createdAt, updatedAt
       FROM OrderItems
      WHERE orderId = :orderId
      ORDER BY id ASC`,
    { orderId }
  );

  return rows.map((row) => ({
    ...row,
    price: Number(row.price || 0),
    qty: Number(row.qty || 0),
  }));
}

export async function findOrderById(
  id: Id,
  conn: PoolConnection | null = null
): Promise<MappedOrder | null> {
  const rows = await runQuery<OrderDbRow>(
    conn,
    `SELECT ${ORDER_SELECT_COLUMNS}
       FROM Orders
      WHERE id = :id
      LIMIT 1`,
    { id }
  );

  return mapOrder(rows[0]);
}

export async function findOrderByIdempotencyKey(
  idempotencyKey: string | null | undefined,
  conn: PoolConnection | null = null
): Promise<MappedOrder | null> {
  if (!idempotencyKey) return null;
  const rows = await runQuery<OrderDbRow>(
    conn,
    `SELECT ${ORDER_SELECT_COLUMNS}
       FROM Orders
      WHERE idempotencyKey = :idempotencyKey
      LIMIT 1`,
    { idempotencyKey }
  );

  return mapOrder(rows[0]);
}

export async function listOrdersByUserId(userId: Id): Promise<MappedOrder[]> {
  const rows = await query<OrderDbRow>(
    `SELECT ${ORDER_SELECT_COLUMNS}
       FROM Orders
      WHERE userId = :userId
      ORDER BY createdAt DESC`,
    { userId }
  );

  return rows.map((r) => mapOrder(r) as MappedOrder);
}

export async function listAllOrders({
  page = 1,
  perPage = 10,
}: {
  page?: number;
  perPage?: number;
}): Promise<{
  orders: MappedOrder[];
  totalOrders: number;
  totalPages: number;
  page: number;
}> {
  const offset = (page - 1) * perPage;
  const [countRows, orderRows] = await Promise.all([
    query<{ totalOrders: number } & RowDataPacket>(
      `SELECT COUNT(*) AS totalOrders FROM Orders`
    ),
    query<OrderDbRow>(
      `SELECT ${ORDER_SELECT_COLUMNS}
         FROM Orders
         ORDER BY createdAt DESC
         LIMIT :limit OFFSET :offset`,
      { limit: perPage, offset }
    ),
  ]);

  const totalOrders = Number(countRows[0]?.totalOrders || 0);
  return {
    orders: orderRows.map((r) => mapOrder(r) as MappedOrder),
    totalOrders,
    totalPages: Math.max(1, Math.ceil(totalOrders / perPage)),
    page,
  };
}

export async function updateOrderStatus(
  id: Id,
  status: OrderStatus | string,
  trackingNumber: string | null = null,
  courierName: string | null = null,
  trackingUrl: string | null = null
): Promise<boolean> {
  await ensureOrdersReviewSchema();
  // Stamp deliveredAt the first time status flips to 'delivered'. COALESCE keeps
  // the original timestamp if an admin re-saves the same status later.
  const deliveredClause =
    status === "delivered" ? ", deliveredAt = COALESCE(deliveredAt, NOW())" : "";
  const result = await execute(
    `UPDATE Orders
     SET status = :status,
         trackingNumber = COALESCE(:trackingNumber, trackingNumber),
         courierName    = COALESCE(:courierName,    courierName),
         trackingUrl    = COALESCE(:trackingUrl,    trackingUrl),
         updatedAt      = NOW()${deliveredClause}
     WHERE id = :id`,
    {
      id,
      status,
      trackingNumber: trackingNumber || null,
      courierName: courierName || null,
      trackingUrl: trackingUrl || null,
    }
  );

  return result.affectedRows > 0;
}

export async function bulkUpdateOrderStatus(
  ids: (Id | string | number)[],
  status: OrderStatus | string
): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const normalized = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (!normalized.length) return 0;
  await ensureOrdersReviewSchema();
  const deliveredClause =
    status === "delivered" ? ", deliveredAt = COALESCE(deliveredAt, NOW())" : "";
  const result = await execute(
    `UPDATE Orders
        SET status = :status, updatedAt = NOW()${deliveredClause}
      WHERE id IN (${normalized.join(",")})`,
    { status }
  );
  return result.affectedRows || 0;
}

export interface ReviewReminderCandidate extends RowDataPacket {
  id: Id;
  userId: Id;
  items: OrderItem[] | string;
  deliveredAt: Date | string | null;
  userEmail: string | null;
  userName: string | null;
}

export async function findOrdersDueForReviewReminder(
  { daysAfter = 7, limit = 100 }: { daysAfter?: number; limit?: number } = {}
): Promise<(Omit<ReviewReminderCandidate, "items"> & { items: OrderItem[] })[]> {
  await ensureOrdersReviewSchema();
  const rows = await query<ReviewReminderCandidate>(
    `SELECT o.id, o.userId, o.items, o.deliveredAt, u.email AS userEmail, u.name AS userName
       FROM Orders o
       JOIN Users u ON u.id = o.userId
      WHERE o.status = 'delivered'
        AND o.deliveredAt IS NOT NULL
        AND o.deliveredAt <= NOW() - INTERVAL :daysAfter DAY
        AND o.reviewReminderSentAt IS NULL
        AND u.email IS NOT NULL AND u.email <> ''
      ORDER BY o.deliveredAt ASC
      LIMIT :limit`,
    { daysAfter: Number(daysAfter) || 7, limit: Number(limit) || 100 }
  );
  return rows.map((r) => ({
    ...r,
    items: safeParseJson<OrderItem[]>(r.items, []),
  }));
}

export async function markReviewReminderSent(orderId: Id): Promise<void> {
  await execute(
    `UPDATE Orders SET reviewReminderSentAt = NOW() WHERE id = :id`,
    { id: orderId }
  );
}

export async function markOrderCancelled(
  id: Id,
  { reason = null, by = "system" }: { reason?: string | null; by?: string } = {},
  conn: PoolConnection | null = null
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `UPDATE Orders
       SET status       = 'cancelled',
           cancelledAt  = NOW(),
           cancelReason = :reason,
           cancelledBy  = :by,
           updatedAt    = NOW()
     WHERE id = :id`,
    { id, reason, by }
  );

  return result.affectedRows > 0;
}

export async function markOrderRefunded(
  id: Id,
  conn: PoolConnection | null = null
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `UPDATE Orders
       SET status    = 'refunded',
           updatedAt = NOW()
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}

export async function markOrderPaid(
  id: Id,
  paymentResult: PaymentResult,
  conn: PoolConnection | null = null
): Promise<boolean> {
  const result = await runExecute(
    conn,
    `UPDATE Orders
       SET isPaid        = 1,
           paidAt        = COALESCE(paidAt, NOW()),
           paymentResult = :paymentResult,
           updatedAt     = NOW()
     WHERE id = :id AND isPaid = 0`,
    { id, paymentResult: JSON.stringify(paymentResult || {}) }
  );

  return result.affectedRows > 0;
}

export async function findPaidOrderByPaymentId(
  paymentId: string | null | undefined,
  conn: PoolConnection | null = null
): Promise<MappedOrder | null> {
  if (!paymentId) return null;
  const rows = await runQuery<OrderDbRow>(
    conn,
    `SELECT ${ORDER_SELECT_COLUMNS}
       FROM Orders
      WHERE isPaid = 1 AND JSON_UNQUOTE(JSON_EXTRACT(paymentResult, '$.id')) = :paymentId
      LIMIT 1`,
    { paymentId }
  );

  return mapOrder(rows[0]);
}

export async function findOrderByPaymentId(
  paymentId: string | null | undefined,
  conn: PoolConnection | null = null
): Promise<MappedOrder | null> {
  if (!paymentId) return null;
  const rows = await runQuery<OrderDbRow>(
    conn,
    `SELECT ${ORDER_SELECT_COLUMNS}
       FROM Orders
      WHERE JSON_UNQUOTE(JSON_EXTRACT(paymentResult, '$.id')) = :paymentId
      LIMIT 1`,
    { paymentId }
  );

  return mapOrder(rows[0]);
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

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return value as T;
    }
    return JSON.parse((value as string) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}
