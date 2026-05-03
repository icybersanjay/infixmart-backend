import type { RowDataPacket } from "mysql2/promise";
import { query } from "../db/mysql.js";
import type {
  Bit,
  DecimalString,
  Id,
  SqlDateTime,
  UserRole,
  UserStatus,
} from "../types.js";

interface AdminSearchProductRow extends RowDataPacket {
  id: Id;
  name: string;
  brand: string | null;
  sku: string | null;
  price: DecimalString | number;
  countInStock: number;
  status: string | null;
  images: string | string[] | null;
}

interface AdminSearchUserRow extends RowDataPacket {
  id: Id;
  name: string;
  email: string;
  mobile: string | null;
  role: UserRole | string;
  status: UserStatus | string;
}

interface AdminSearchOrderRow extends RowDataPacket {
  id: Id;
  status: string;
  totalPrice: DecimalString | number;
  createdAt: SqlDateTime;
  isPaid: Bit;
  paymentMethod: string;
}

export interface AdminQuickSearchResult {
  orders: Array<{
    id: Id;
    status: string;
    totalPrice: number;
    createdAt: SqlDateTime;
    isPaid: boolean;
    paymentMethod: string;
  }>;
  products: Array<{
    id: Id;
    name: string;
    brand: string | null;
    sku: string | null;
    price: number;
    countInStock: number;
    status: string;
    image: string | null;
  }>;
  users: Array<{
    id: Id;
    name: string;
    email: string;
    mobile: string | null;
    role: UserRole | string;
    status: UserStatus | string;
  }>;
}

/**
 * Cross-entity quick search for the admin command bar. Returns up to a few
 * results per group (orders, products, users) for the given short query.
 */
export async function quickSearch(
  rawQuery: string,
  { limit = 6 }: { limit?: number } = {}
): Promise<AdminQuickSearchResult> {
  const q = String(rawQuery || "").trim();
  if (q.length < 1) {
    return { orders: [], products: [], users: [] };
  }

  const like = `%${q}%`;
  const numeric = /^\d+$/.test(q) ? Number(q) : null;

  const [products, users, orders] = await Promise.all([
    query<AdminSearchProductRow>(
      `SELECT id, name, brand, sku, price, countInStock, status, images
         FROM Products
        WHERE (name LIKE :like OR sku LIKE :like OR brand LIKE :like)
        ORDER BY (purchaseCount * 5 + viewCount) DESC
        LIMIT :limit`,
      { like, limit: Number(limit) }
    ),
    query<AdminSearchUserRow>(
      `SELECT id, name, email, mobile, role, status
         FROM Users
        WHERE name LIKE :like OR email LIKE :like OR mobile LIKE :like
        ORDER BY createdAt DESC
        LIMIT :limit`,
      { like, limit: Number(limit) }
    ),
    numeric != null
      ? query<AdminSearchOrderRow>(
          `SELECT id, status, totalPrice, createdAt, isPaid, paymentMethod
             FROM Orders
            WHERE id = :id
            LIMIT :limit`,
          { id: numeric, limit: Number(limit) }
        )
      : query<AdminSearchOrderRow>(
          `SELECT id, status, totalPrice, createdAt, isPaid, paymentMethod
             FROM Orders
            WHERE JSON_UNQUOTE(JSON_EXTRACT(shippingAddress, '$.name')) LIKE :like
            ORDER BY createdAt DESC
            LIMIT :limit`,
          { like, limit: Number(limit) }
        ),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalPrice: Number(o.totalPrice || 0),
      createdAt: o.createdAt,
      isPaid: Boolean(o.isPaid),
      paymentMethod: o.paymentMethod,
    })),
    products: products.map((p) => {
      let images: string[] = [];
      try {
        images = Array.isArray(p.images) ? p.images : JSON.parse((p.images as string) || "[]");
      } catch {
        images = [];
      }
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        price: Number(p.price || 0),
        countInStock: Number(p.countInStock || 0),
        status: p.status || "active",
        image: images[0] || null,
      };
    }),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
    })),
  };
}
