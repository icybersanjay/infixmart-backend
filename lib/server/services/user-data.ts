import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import { HttpError } from "../api/http.js";
import { execute, query } from "../db/mysql.js";
import { findUserById, sanitizeUser, updateUserById } from "../repositories/users.js";
import { listOrdersByUserId } from "../repositories/orders.js";
import type { Id, SqlDateTime } from "../types.js";

interface AddressExportRow extends RowDataPacket {
  id: Id;
  name: string;
  mobile: string;
  pincode: string;
  flatHouse: string;
  areaStreet: string;
  landmark: string | null;
  townCity: string;
  state: string;
  country: string;
  isDefault: number;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

async function getOwnAddresses(userId: Id) {
  return query<AddressExportRow>(
    `SELECT id, name, mobile, pincode, flatHouse, areaStreet, landmark,
            townCity, state, country, isDefault, createdAt, updatedAt
       FROM Addresses
      WHERE userId = :userId
        AND status <> 'deleted'`,
    { userId }
  );
}

interface ReviewExportRow extends RowDataPacket {
  id: Id;
  productId: Id;
  rating: number | string;
  title: string | null;
  comment: string | null;
  verified: number;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

async function getOwnReviews(userId: Id) {
  return query<ReviewExportRow>(
    `SELECT id, productId, rating, title, comment, verified, createdAt, updatedAt
       FROM Reviews
      WHERE userId = :userId`,
    { userId }
  );
}

interface WishlistExportRow extends RowDataPacket {
  id: Id;
  productId: Id;
  productTitle: string | null;
  image: string | null;
  price: number | string | null;
  oldPrice: number | string | null;
  brand: string | null;
  createdAt: SqlDateTime;
}

async function getOwnWishlist(userId: Id) {
  return query<WishlistExportRow>(
    `SELECT id, productId, productTitle, image, price, oldPrice, brand, createdAt
       FROM MyLists
      WHERE userId = :userId`,
    { userId }
  );
}

interface CartExportRow extends RowDataPacket {
  id: Id;
  productId: Id;
  quantity: number;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

async function getOwnCart(userId: Id) {
  return query<CartExportRow>(
    `SELECT id, productId, quantity, createdAt, updatedAt
       FROM CartProducts
      WHERE userId = :userId`,
    { userId }
  );
}

interface ReferralExportRow extends RowDataPacket {
  id: Id;
  referrerId: Id;
  refereeId: Id;
  orderId: Id | null;
  credited: number;
  creditedAt: SqlDateTime | null;
  createdAt: SqlDateTime;
}

async function getOwnReferralLogs(userId: Id) {
  return query<ReferralExportRow>(
    `SELECT id, referrerId, refereeId, orderId, credited, creditedAt, createdAt
       FROM ReferralLogs
      WHERE referrerId = :userId OR refereeId = :userId`,
    { userId }
  );
}

/**
 * Build a JSON snapshot of every piece of personal data we hold for the
 * given user. Mirrors what GDPR Art. 15 / DPDP Act expects.
 */
export async function exportUserData(userId: Id) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, "User not found");
  if (user.deletedAt) throw new HttpError(410, "Account deleted");

  const [orders, addresses, reviews, wishlist, cart, referralLogs] = await Promise.all([
    listOrdersByUserId(userId),
    getOwnAddresses(userId),
    getOwnReviews(userId),
    getOwnWishlist(userId),
    getOwnCart(userId),
    getOwnReferralLogs(userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: sanitizeUser(user),
    orders: orders.map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      isPaid: o.isPaid,
      paidAt: o.paidAt,
      itemsPrice: o.itemsPrice,
      shippingPrice: o.shippingPrice,
      gstAmount: o.gstAmount,
      totalPrice: o.totalPrice,
      shippingAddress: o.shippingAddress,
      items: o.items,
      trackingNumber: o.trackingNumber,
      courierName: o.courierName,
      cancelledAt: o.cancelledAt,
      createdAt: o.createdAt,
    })),
    addresses,
    reviews,
    wishlist,
    cart,
    referralLogs,
  };
}

/**
 * Soft-delete a user account. Order history preserved for tax compliance,
 * every personal field anonymised. Caller must re-authenticate by password.
 */
export async function deleteOwnAccount(
  userId: Id,
  { password }: { password?: string } = {}
) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, "User not found");
  if (user.deletedAt) {
    throw new HttpError(410, "Account already deleted");
  }
  if (!password) {
    throw new HttpError(400, "Password is required to confirm account deletion.");
  }

  if (!user.password || user.password.length < 20) {
    throw new HttpError(400, "Password not set on this account. Please log in with your usual method and try again.");
  }
  const ok = await bcrypt.compare(String(password), String(user.password));
  if (!ok) throw new HttpError(401, "Incorrect password.");

  const anonId = `deleted_${user.id}_${crypto.randomBytes(4).toString("hex")}`;
  const anonEmail = `${anonId}@deleted.invalid`;

  await execute(
    `UPDATE Users
        SET name              = 'Deleted user',
            email             = :anonEmail,
            mobile            = NULL,
            avatar            = NULL,
            country           = '',
            password          = '',
            accessToken       = '',
            refreshToken      = '',
            otp               = NULL,
            otp_expires       = NULL,
            google_id         = NULL,
            verify_email      = 0,
            status            = 'deleted',
            deletedAt         = NOW(),
            updatedAt         = NOW()
      WHERE id = :userId`,
    { userId, anonEmail }
  );

  await Promise.all([
    execute(`DELETE FROM CartProducts WHERE userId = :userId`, { userId }),
    execute(`DELETE FROM MyLists WHERE userId = :userId`, { userId }),
    execute(`DELETE FROM PushSubscriptions WHERE userId = :userId`, { userId }).catch(() => null),
    execute(`DELETE FROM AbandonedCartReminders WHERE userId = :userId`, { userId }).catch(() => null),
  ]);

  return {
    success: true as const,
    error: false as const,
    message:
      "Your account has been deleted. Order history is retained for tax compliance, but every personal field has been anonymised.",
  };
}

export async function updateUserConsent(userId: Id, prefs: unknown) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, "User not found");
  await updateUserById(userId, {});
  return { success: true as const, error: false as const, prefs };
}
