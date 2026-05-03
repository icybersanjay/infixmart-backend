import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { HttpError } from "../api/http.js";
import {
  createCoupon,
  deleteCoupon,
  findCouponByCode,
  findCouponById,
  listCoupons,
  updateCoupon,
} from "../repositories/coupons.js";
import { query } from "../db/mysql.js";
import type { Coupon, CouponRestrictionType, Id } from "../types.js";

function normalizeCode(code: unknown): string {
  return String(code || "").toUpperCase().trim();
}

function normalizeRestrictionType(type: unknown): CouponRestrictionType {
  if (type === "first_order" || type === "email") return type;
  return "none";
}

export function calculateCouponDiscount(
  coupon: { type: string; value: number; maxDiscount: number | null },
  total: number
): number {
  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.round((total * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = Number(coupon.value || 0);
  }
  return Math.min(Math.round(discount), total);
}

interface UserEmailRow extends RowDataPacket {
  email: string | null;
}

interface CountRow extends RowDataPacket {
  cnt: number | string;
}

/**
 * Shared restriction validator — used by both applyCouponCode (preview) and
 * validateCoupon (order creation). Pass conn only in the order-creation path.
 */
export async function checkCouponRestrictions(
  coupon: Pick<Coupon, "restrictionType" | "restrictedEmail">,
  userId: Id | null,
  conn: PoolConnection | null = null
): Promise<void> {
  if (coupon.restrictionType === "none") return;

  if (!userId) {
    throw new HttpError(401, "Please log in to use this coupon");
  }

  if (coupon.restrictionType === "email") {
    const rows = conn
      ? (await conn.query(`SELECT email FROM Users WHERE id = :userId LIMIT 1`, { userId } as unknown as never))[0] as UserEmailRow[]
      : await query<UserEmailRow>(`SELECT email FROM Users WHERE id = :userId LIMIT 1`, { userId });

    const userEmail = String(rows[0]?.email || "").toLowerCase().trim();
    const restricted = String(coupon.restrictedEmail || "").toLowerCase().trim();

    if (!restricted) {
      throw new HttpError(400, "This coupon has no valid email restriction configured");
    }
    if (userEmail !== restricted) {
      throw new HttpError(403, "This coupon is not valid for your account");
    }
    return;
  }

  if (coupon.restrictionType === "first_order") {
    const rows = conn
      ? (await conn.query(`SELECT COUNT(*) AS cnt FROM Orders WHERE userId = :userId AND isPaid = 1`, { userId } as unknown as never))[0] as CountRow[]
      : await query<CountRow>(`SELECT COUNT(*) AS cnt FROM Orders WHERE userId = :userId AND isPaid = 1`, { userId });

    const paidOrderCount = Number(rows[0]?.cnt || 0);
    if (paidOrderCount > 0) {
      throw new HttpError(403, "This coupon is only valid for first-time orders");
    }
    return;
  }
}

export async function getAllCouponsAdmin() {
  return { coupons: await listCoupons(), success: true as const, error: false as const };
}

interface CouponBody {
  code?: string;
  description?: string | null;
  type?: string;
  value?: number | string;
  minOrderValue?: number | string;
  maxDiscount?: number | string | null;
  usageLimit?: number | string | null;
  isActive?: boolean;
  expiresAt?: string | Date | null;
  restrictionType?: CouponRestrictionType | string;
  restrictedEmail?: string | null;
}

export async function createCouponRecord(body: CouponBody | null | undefined) {
  const code = normalizeCode(body?.code);
  const value = Number(body?.value);
  if (!code || !value) {
    throw new HttpError(400, "Code and value are required");
  }

  const restrictionType = normalizeRestrictionType(body?.restrictionType);
  const restrictedEmail =
    restrictionType === "email"
      ? String(body?.restrictedEmail || "").toLowerCase().trim() || null
      : null;

  if (restrictionType === "email" && !restrictedEmail) {
    throw new HttpError(400, "An email address is required for email-restricted coupons");
  }

  const existing = await findCouponByCode(code);
  if (existing) {
    throw new HttpError(400, "Coupon code already exists");
  }

  return {
    coupon: await createCoupon({
      code,
      description: body?.description || null,
      type: (body?.type || "percent") as never,
      value,
      minOrderValue: Number(body?.minOrderValue || 0),
      maxDiscount: body?.maxDiscount ? Number(body.maxDiscount) : null,
      usageLimit: body?.usageLimit ? Number(body.usageLimit) : null,
      isActive: body?.isActive !== false,
      expiresAt: (body?.expiresAt || null) as never,
      restrictionType,
      restrictedEmail,
    }),
    message: "Coupon created successfully",
    success: true as const,
    error: false as const,
  };
}

export async function updateCouponRecord(id: Id, body: CouponBody | null | undefined) {
  const existing = await findCouponById(id);
  if (!existing) {
    throw new HttpError(404, "Coupon not found");
  }

  const restrictionType =
    body?.restrictionType !== undefined
      ? normalizeRestrictionType(body.restrictionType)
      : existing.restrictionType;

  const restrictedEmail =
    restrictionType === "email"
      ? String(body?.restrictedEmail ?? existing.restrictedEmail ?? "").toLowerCase().trim() || null
      : null;

  if (restrictionType === "email" && !restrictedEmail) {
    throw new HttpError(400, "An email address is required for email-restricted coupons");
  }

  return {
    coupon: await updateCoupon(id, {
      code: body?.code ? normalizeCode(body.code) : existing.code,
      description: body?.description ?? existing.description,
      type: (body?.type ?? existing.type) as never,
      value: body?.value !== undefined ? Number(body.value) : existing.value,
      minOrderValue:
        body?.minOrderValue !== undefined
          ? Number(body.minOrderValue)
          : existing.minOrderValue,
      maxDiscount:
        body?.maxDiscount !== undefined
          ? body.maxDiscount ? Number(body.maxDiscount) : null
          : existing.maxDiscount,
      usageLimit:
        body?.usageLimit !== undefined
          ? body.usageLimit ? Number(body.usageLimit) : null
          : existing.usageLimit,
      isActive: body?.isActive !== undefined ? body.isActive : existing.isActive,
      expiresAt: (body?.expiresAt !== undefined ? body.expiresAt || null : existing.expiresAt) as never,
      restrictionType,
      restrictedEmail,
    }),
    message: "Coupon updated",
    success: true as const,
    error: false as const,
  };
}

export async function deleteCouponRecord(id: Id) {
  const deleted = await deleteCoupon(id);
  if (!deleted) {
    throw new HttpError(404, "Coupon not found");
  }
  return { message: "Coupon deleted", success: true as const, error: false as const };
}

interface ApplyCouponBody {
  code?: string;
  cartTotal?: number | string;
}

export async function applyCouponCode(body: ApplyCouponBody | null | undefined, userId: Id | null = null) {
  const code = normalizeCode(body?.code);
  if (!code) {
    return { error: true, message: "Coupon code is required" };
  }

  const coupon = await findCouponByCode(code);
  if (!coupon || !coupon.isActive) {
    return { error: true, message: "Invalid or expired coupon code" };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt as string | Date) < new Date()) {
    return { error: true, message: "This coupon has expired" };
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { error: true, message: "This coupon has reached its usage limit" };
  }

  const total = Number(body?.cartTotal) || 0;
  if (total < coupon.minOrderValue) {
    return {
      error: true,
      message: `Minimum order value ₹${coupon.minOrderValue} required for this coupon`,
    };
  }

  try {
    await checkCouponRestrictions(coupon, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "This coupon cannot be applied to your account";
    return { error: true, message };
  }

  const discount = calculateCouponDiscount(
    { type: coupon.type, value: coupon.value, maxDiscount: coupon.maxDiscount },
    total
  );
  return {
    error: false,
    discount,
    message: `Coupon applied! You save ₹${discount}`,
    couponCode: coupon.code,
    type: coupon.type,
    value: coupon.value,
  };
}
