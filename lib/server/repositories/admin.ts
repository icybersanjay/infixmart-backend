import type { RowDataPacket } from "mysql2/promise";
import { query } from "../db/mysql.js";
import type {
  DecimalString,
  Id,
  OrderItem,
  OrderRow,
  PaymentResult,
  ShippingAddress,
  SqlDateTime,
  UserStatus,
  UserRole,
  Bit,
} from "../types.js";

interface CountRow extends RowDataPacket {
  totalOrders?: number | string;
  totalUsers?: number | string;
  totalProducts?: number | string;
  totalRevenue?: DecimalString | number;
  deliveredOrders?: number | string;
  lowStockCount?: number | string;
  returnedOrders?: number | string;
  cancelledOrders?: number | string;
  revenue30?: DecimalString | number;
}

interface TopProductRow extends RowDataPacket {
  id: Id;
  name: string;
  brand: string | null;
  sku: string | null;
  price: DecimalString | number;
  purchaseCount: number | null;
  viewCount: number | null;
  countInStock: number | null;
}

export interface DashboardTopProduct {
  id: Id;
  name: string;
  brand: string | null;
  sku: string | null;
  price: number;
  purchaseCount: number;
  viewCount: number;
  countInStock: number;
}

export interface AdminDashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  totalRevenue: number;
  aov: number;
  deliveredOrders: number;
  returnedOrders: number;
  cancelledOrders: number;
  returnRate: number;
  revenue30Days: number;
  lowStockCount: number;
  topProducts: DashboardTopProduct[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    ordersRow,
    usersRow,
    productsRow,
    revenueRow,
    deliveredRow,
    lowStockRow,
    returnedRow,
    cancelledRow,
    revenue30Row,
    topProductsRows,
  ] = await Promise.all([
    query<CountRow>(`SELECT COUNT(*) AS totalOrders FROM Orders`),
    query<CountRow>(`SELECT COUNT(*) AS totalUsers FROM Users`),
    query<CountRow>(`SELECT COUNT(*) AS totalProducts FROM Products`),
    query<CountRow>(`SELECT COALESCE(SUM(totalPrice), 0) AS totalRevenue FROM Orders WHERE status != 'cancelled'`),
    query<CountRow>(`SELECT COUNT(*) AS deliveredOrders FROM Orders WHERE status = 'delivered'`),
    query<CountRow>(`SELECT COUNT(*) AS lowStockCount
             FROM Products
            WHERE countInStock >= 0
              AND countInStock <= COALESCE(reorderThreshold, 5)`),
    query<CountRow>(`SELECT COUNT(*) AS returnedOrders FROM Orders WHERE status IN ('returned','refunded')`),
    query<CountRow>(`SELECT COUNT(*) AS cancelledOrders FROM Orders WHERE status = 'cancelled'`),
    query<CountRow>(`SELECT COALESCE(SUM(totalPrice), 0) AS revenue30
             FROM Orders
            WHERE status != 'cancelled'
              AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`),
    query<TopProductRow>(`SELECT id, name, brand, sku, price, purchaseCount, viewCount, countInStock
             FROM Products
            WHERE COALESCE(status, 'active') = 'active'
            ORDER BY purchaseCount DESC, viewCount DESC
            LIMIT 10`),
  ]);

  const totalOrders = Number(ordersRow[0]?.totalOrders || 0);
  const totalRevenue = Number(revenueRow[0]?.totalRevenue || 0);
  const deliveredOrders = Number(deliveredRow[0]?.deliveredOrders || 0);
  const returnedOrders = Number(returnedRow[0]?.returnedOrders || 0);
  const cancelledOrders = Number(cancelledRow[0]?.cancelledOrders || 0);

  return {
    totalOrders,
    totalUsers: Number(usersRow[0]?.totalUsers || 0),
    totalProducts: Number(productsRow[0]?.totalProducts || 0),
    totalRevenue,
    aov: deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0,
    deliveredOrders,
    returnedOrders,
    cancelledOrders,
    returnRate:
      deliveredOrders > 0
        ? Math.round((returnedOrders / deliveredOrders) * 1000) / 10
        : 0,
    revenue30Days: Number(revenue30Row[0]?.revenue30 || 0),
    lowStockCount: Number(lowStockRow[0]?.lowStockCount || 0),
    topProducts: (topProductsRows || []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      price: Number(p.price || 0),
      purchaseCount: Number(p.purchaseCount || 0),
      viewCount: Number(p.viewCount || 0),
      countInStock: Number(p.countInStock || 0),
    })),
  };
}

// ── Rich dashboard metrics ─────────────────────────────────────────────
//
// Adds the per-day revenue series, top-categories breakdown, RTO rate, and
// growth signals (new users, repeat customers, abandoned carts) on top of
// the totals returned by getAdminDashboardStats(). Kept as a separate query
// so the existing dashboard call doesn't pay the cost when not asked for —
// the service layer concatenates them.

interface RevenueSeriesRow extends RowDataPacket {
  bucket: string; // 'YYYY-MM-DD'
  revenue: DecimalString | number | null;
  orderCount: number | string;
}

interface TopCategoryRow extends RowDataPacket {
  catName: string | null;
  revenue: DecimalString | number | null;
  orderCount: number | string;
}

interface NewUsersBucketRow extends RowDataPacket {
  newToday: number | string;
  new7d: number | string;
  new30d: number | string;
}

interface OrderCohortRow extends RowDataPacket {
  paidOrderCount: number | string;
  uniquePayingUsers: number | string;
  repeatOrderCount: number | string;
}

interface AbandonedRow extends RowDataPacket {
  abandoned: number | string;
  recovered: number | string;
}

export interface DashboardSeriesPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface DashboardTopCategory {
  catName: string;
  revenue: number;
  orderCount: number;
}

export interface DashboardSeries {
  windowDays: number;
  revenueSeries: DashboardSeriesPoint[];
  revenueWindow: number;
  ordersWindow: number;
  topCategories: DashboardTopCategory[];
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  repeatCustomerRate: number;
  rtoRate: number;
  cartAbandonmentRate: number;
}

/**
 * Per-day revenue + supporting business metrics for the admin dashboard.
 * Window defaults to 30 days; a 90-day window is reasonable for trend views.
 *
 * Notes:
 *  - "Revenue" excludes cancelled orders (matches getAdminDashboardStats).
 *  - "RTO rate" = (returned + refunded + cancelled-after-shipped) / shipped+,
 *    expressed as a 1-decimal %. We approximate "shipped+" as anything that
 *    ever left pending/processing — i.e. status IN ('shipped','delivered','returned','refunded','cancelled')
 *    minus cancelled-before-ship. Since we don't track ship timestamps for
 *    cancellations, we treat ALL cancelled orders as RTO for this metric.
 *    That's slightly pessimistic but admin-useful.
 *  - "Repeat customer rate" = (paid orders from users with ≥2 paid orders) / total paid orders.
 *  - "Cart abandonment rate" = abandoned / (abandoned + recovered) over the window.
 */
export async function getDashboardSeries(
  { windowDays = 30 }: { windowDays?: number } = {}
): Promise<DashboardSeries> {
  const days = Math.max(1, Math.min(365, Math.floor(windowDays) || 30));
  const params = { days };

  const [
    seriesRows,
    topCategoryRows,
    newUsersRow,
    cohortRow,
    rtoStatusRows,
    deliveredRow,
    abandonedRow,
  ] = await Promise.all([
    query<RevenueSeriesRow>(
      `SELECT DATE(createdAt) AS bucket,
              COALESCE(SUM(totalPrice), 0) AS revenue,
              COUNT(*) AS orderCount
         FROM Orders
        WHERE status != 'cancelled'
          AND createdAt >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
        GROUP BY DATE(createdAt)
        ORDER BY bucket ASC`,
      params
    ),
    query<TopCategoryRow>(
      `SELECT p.catName AS catName,
              COALESCE(SUM(oi.price * oi.qty), 0) AS revenue,
              COUNT(DISTINCT oi.orderId) AS orderCount
         FROM OrderItems oi
         JOIN Orders o   ON o.id = oi.orderId
         JOIN Products p ON p.id = oi.productId
        WHERE o.status != 'cancelled'
          AND o.createdAt >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
          AND p.catName IS NOT NULL AND p.catName <> ''
        GROUP BY p.catName
        ORDER BY revenue DESC
        LIMIT 5`,
      params
    ),
    query<NewUsersBucketRow>(
      `SELECT
         SUM(CASE WHEN createdAt >= CURDATE() THEN 1 ELSE 0 END) AS newToday,
         SUM(CASE WHEN createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS new7d,
         SUM(CASE WHEN createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS new30d
       FROM Users`
    ),
    query<OrderCohortRow>(
      `SELECT
         (SELECT COUNT(*) FROM Orders WHERE isPaid = 1) AS paidOrderCount,
         (SELECT COUNT(DISTINCT userId) FROM Orders WHERE isPaid = 1) AS uniquePayingUsers,
         (SELECT COALESCE(SUM(c - 1), 0) FROM (
            SELECT COUNT(*) AS c FROM Orders WHERE isPaid = 1 GROUP BY userId HAVING c >= 2
          ) sub) AS repeatOrderCount`
    ),
    query<{ status: string; n: number | string } & RowDataPacket>(
      `SELECT status, COUNT(*) AS n
         FROM Orders
        WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL :days DAY)
          AND status IN ('returned','refunded','cancelled','delivered','shipped')
        GROUP BY status`,
      params
    ),
    query<{ delivered: number | string } & RowDataPacket>(
      `SELECT COUNT(*) AS delivered
         FROM Orders
        WHERE status = 'delivered'
          AND createdAt >= DATE_SUB(CURDATE(), INTERVAL :days DAY)`,
      params
    ),
    query<AbandonedRow>(
      `SELECT
         SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS abandoned,
         SUM(CASE WHEN status = 'recovered' THEN 1 ELSE 0 END) AS recovered
       FROM AbandonedCartReminders
       WHERE updatedAt >= DATE_SUB(CURDATE(), INTERVAL :days DAY)`,
      params
    ).catch(() => [] as AbandonedRow[]),
  ]);

  // Fill missing days with zeros so the sparkline has a uniform x-axis.
  const seriesByDate = new Map<string, { revenue: number; orderCount: number }>();
  for (const r of seriesRows) {
    const d = new Date(r.bucket as unknown as string | Date);
    const key = d.toISOString().slice(0, 10);
    seriesByDate.set(key, {
      revenue: Number(r.revenue || 0),
      orderCount: Number(r.orderCount || 0),
    });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const filled: DashboardSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const slot = seriesByDate.get(key);
    filled.push({
      date: key,
      revenue: slot?.revenue ?? 0,
      orderCount: slot?.orderCount ?? 0,
    });
  }
  const revenueWindow = filled.reduce((sum, p) => sum + p.revenue, 0);
  const ordersWindow = filled.reduce((sum, p) => sum + p.orderCount, 0);

  const topCategories: DashboardTopCategory[] = topCategoryRows.map((r) => ({
    catName: String(r.catName ?? "Uncategorized"),
    revenue: Number(r.revenue || 0),
    orderCount: Number(r.orderCount || 0),
  }));

  const u = newUsersRow[0];
  const cohort = cohortRow[0];
  const paidOrderCount = Number(cohort?.paidOrderCount || 0);
  const repeatOrderCount = Number(cohort?.repeatOrderCount || 0);
  const repeatCustomerRate =
    paidOrderCount > 0 ? Math.round((repeatOrderCount / paidOrderCount) * 1000) / 10 : 0;

  // RTO calc — see comment above.
  let returnedShare = 0;
  let totalShipped = 0;
  for (const r of rtoStatusRows) {
    const n = Number(r.n || 0);
    if (r.status === "returned" || r.status === "refunded" || r.status === "cancelled") {
      returnedShare += n;
    }
    totalShipped += n;
  }
  const deliveredWindow = Number(deliveredRow[0]?.delivered || 0);
  // Use deliveredWindow (denom) where possible — RTO % vs delivered is the
  // industry-standard interpretation for ecommerce ops.
  const rtoRate = deliveredWindow > 0
    ? Math.round((returnedShare / Math.max(1, deliveredWindow + returnedShare)) * 1000) / 10
    : 0;

  const a = abandonedRow[0];
  const abandoned = Number(a?.abandoned || 0);
  const recovered = Number(a?.recovered || 0);
  const cartAbandonmentRate = abandoned + recovered > 0
    ? Math.round((abandoned / (abandoned + recovered)) * 1000) / 10
    : 0;

  return {
    windowDays: days,
    revenueSeries: filled,
    revenueWindow,
    ordersWindow,
    topCategories,
    newUsersToday: Number(u?.newToday || 0),
    newUsers7d: Number(u?.new7d || 0),
    newUsers30d: Number(u?.new30d || 0),
    repeatCustomerRate,
    rtoRate,
    cartAbandonmentRate,
  };
}

interface AdminOrderJoinRow extends OrderRow, RowDataPacket {
  user_name?: string | null;
  user_email?: string | null;
}

export interface AdminOrderRow extends Omit<OrderRow, "items" | "shippingAddress" | "paymentResult"> {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentResult: PaymentResult;
  user: { name: string | null; email: string | null } | null;
}

export interface ListAdminOrdersResult {
  orders: AdminOrderRow[];
  totalOrders: number;
  totalPages: number;
  page: number;
}

export async function listAdminOrders({
  page = 1,
  perPage = 10,
  status = "",
}: { page?: number; perPage?: number; status?: string }): Promise<ListAdminOrdersResult> {
  const offset = (page - 1) * perPage;
  const filters: string[] = [];
  const params: Record<string, unknown> = { limit: perPage, offset };

  if (status) {
    filters.push("o.status = :status");
    params.status = status;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [countRows, orderRows] = await Promise.all([
    query<{ totalOrders: number | string } & RowDataPacket>(
      `SELECT COUNT(*) AS totalOrders
       FROM Orders o
       ${whereClause}`,
      params
    ),
    query<AdminOrderJoinRow>(
      `SELECT
         o.*,
         u.name AS user_name,
         u.email AS user_email
       FROM Orders o
       LEFT JOIN Users u ON u.id = o.userId
       ${whereClause}
       ORDER BY o.createdAt DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
  ]);

  const totalOrders = Number(countRows[0]?.totalOrders || 0);
  const totalPages = Math.max(1, Math.ceil(totalOrders / perPage));

  return {
    orders: orderRows.map((row) => {
      const { user_name, user_email, items, shippingAddress, paymentResult, ...rest } = row;
      return {
        ...rest,
        items: safeParseJson<OrderItem[]>(items, []),
        shippingAddress: safeParseJson<ShippingAddress>(shippingAddress, {} as ShippingAddress),
        paymentResult: safeParseJson<PaymentResult>(paymentResult, {} as PaymentResult),
        user:
          user_name || user_email
            ? { name: user_name ?? null, email: user_email ?? null }
            : null,
      } as AdminOrderRow;
    }),
    totalOrders,
    totalPages,
    page,
  };
}

interface AdminUserJoinRow extends RowDataPacket {
  id: Id;
  name: string;
  email: string;
  avatar: string | null;
  mobile: string | null;
  country: string;
  verify_email: Bit;
  last_login_date: SqlDateTime | null;
  status: UserStatus | string;
  google_id: string | null;
  role: UserRole | string;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
  orderCount: number | string | null;
  totalSpent: DecimalString | number | null;
}

export type UserSegment = "new" | "returning" | "high_value" | "inactive" | "regular";

export interface AdminUserRow extends Omit<AdminUserJoinRow, "verify_email" | "orderCount" | "totalSpent"> {
  _id: Id;
  verify_email: boolean;
  orderCount: number;
  totalSpent: number;
  segment: UserSegment;
}

export interface ListUsersResult {
  users: AdminUserRow[];
  totalUsers: number;
  totalPages: number;
  page: number;
}

export async function listUsers({
  page = 1,
  perPage = 20,
  search = "",
  segment = "",
}: { page?: number; perPage?: number; search?: string; segment?: string }): Promise<ListUsersResult> {
  const offset = (page - 1) * perPage;
  const filters: string[] = [];
  const params: Record<string, unknown> = { limit: perPage, offset };

  if (search) {
    filters.push("(u.name LIKE :search OR u.email LIKE :search)");
    params.search = `%${search}%`;
  }

  if (segment === "new") {
    filters.push("u.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
  } else if (segment === "returning") {
    filters.push(`(SELECT COUNT(*) FROM Orders o WHERE o.userId = u.id) >= 2`);
  } else if (segment === "high_value") {
    filters.push(
      `(SELECT COALESCE(SUM(o.totalPrice),0) FROM Orders o WHERE o.userId = u.id AND o.status = 'delivered') >= 2000`
    );
  } else if (segment === "inactive") {
    filters.push(
      "(u.last_login_date IS NULL OR u.last_login_date < DATE_SUB(NOW(), INTERVAL 60 DAY))"
    );
    filters.push(`(SELECT COUNT(*) FROM Orders o WHERE o.userId = u.id) = 0`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [countRows, userRows] = await Promise.all([
    query<{ totalUsers: number | string } & RowDataPacket>(
      `SELECT COUNT(*) AS totalUsers FROM Users u ${whereClause}`,
      params
    ),
    query<AdminUserJoinRow>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.avatar,
         u.mobile,
         u.country,
         u.verify_email,
         u.last_login_date,
         u.status,
         u.google_id,
         u.role,
         u.createdAt,
         u.updatedAt,
         (SELECT COUNT(*) FROM Orders o WHERE o.userId = u.id) AS orderCount,
         (SELECT COALESCE(SUM(o.totalPrice),0) FROM Orders o WHERE o.userId = u.id AND o.status = 'delivered') AS totalSpent
       FROM Users u
       ${whereClause}
       ORDER BY u.createdAt DESC
       LIMIT :limit OFFSET :offset`,
      params
    ),
  ]);

  const totalUsers = Number(countRows[0]?.totalUsers || 0);
  const totalPages = Math.max(1, Math.ceil(totalUsers / perPage));

  return {
    users: userRows.map((row) => {
      const orders = Number(row.orderCount || 0);
      const spent = Number(row.totalSpent || 0);
      const ageMs = Date.now() - new Date(row.createdAt as string | Date).getTime();
      const isNew = ageMs < 30 * 24 * 60 * 60 * 1000;
      let seg: UserSegment = "regular";
      if (isNew && orders === 0) seg = "new";
      else if (orders >= 2) seg = spent >= 2000 ? "high_value" : "returning";
      else if (
        !orders &&
        (!row.last_login_date ||
          new Date(row.last_login_date as string | Date) <
            new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
      )
        seg = "inactive";

      return {
        ...row,
        _id: row.id,
        verify_email: Boolean(row.verify_email),
        orderCount: orders,
        totalSpent: spent,
        segment: seg,
      } as AdminUserRow;
    }),
    totalUsers,
    totalPages,
    page,
  };
}

export interface UserStats {
  orderCount: number;
  totalSpent: number;
}

export async function getUserStats(userId: Id): Promise<UserStats> {
  const [orderCountRows, totalSpentRows] = await Promise.all([
    query<{ orderCount: number | string } & RowDataPacket>(
      `SELECT COUNT(*) AS orderCount
       FROM Orders
       WHERE userId = :userId`,
      { userId }
    ),
    query<{ totalSpent: DecimalString | number } & RowDataPacket>(
      `SELECT COALESCE(SUM(totalPrice), 0) AS totalSpent
       FROM Orders
       WHERE userId = :userId`,
      { userId }
    ),
  ]);

  return {
    orderCount: Number(orderCountRows[0]?.orderCount || 0),
    totalSpent: Number(totalSpentRows[0]?.totalSpent || 0),
  };
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  try {
    if (value && typeof value === "object") return value as T;
    return JSON.parse((value as string) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

interface OrdersForExportRow extends RowDataPacket {
  id: Id;
  customerName: string | null;
  customerEmail: string | null;
  totalPrice: DecimalString | number;
  itemsPrice: DecimalString | number;
  shippingPrice: DecimalString | number;
  gstAmount: DecimalString | number;
  status: string;
  paymentMethod: string;
  isPaid: Bit;
  paidAt: SqlDateTime | null;
  createdAt: SqlDateTime;
  shippingAddress: string | null;
}

export async function listOrdersForExport({
  from,
  to,
  status,
}: {
  from?: string;
  to?: string;
  status?: string;
}): Promise<OrdersForExportRow[]> {
  const filters: string[] = [];
  const params: Record<string, unknown> = {};

  if (from) {
    filters.push("o.createdAt >= :from");
    params.from = from + " 00:00:00";
  }
  if (to) {
    filters.push("o.createdAt <= :to");
    params.to = to + " 23:59:59";
  }
  if (status) {
    filters.push("o.status = :status");
    params.status = status;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  return query<OrdersForExportRow>(
    `SELECT o.id, u.name AS customerName, u.email AS customerEmail,
            o.totalPrice, o.itemsPrice, o.shippingPrice, o.gstAmount,
            o.status, o.paymentMethod, o.isPaid, o.paidAt,
            o.createdAt, o.shippingAddress
     FROM Orders o
     LEFT JOIN Users u ON u.id = o.userId
     ${whereClause}
     ORDER BY o.createdAt DESC
     LIMIT 5000`,
    params
  );
}
