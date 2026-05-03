import bcrypt from "bcryptjs";
import { HttpError } from "../api/http.js";
import { adminLoginSchema, validate } from "../api/schemas.js";
import {
  clearLoginFailures,
  isLocked,
  lockoutSecondsRemaining,
  registerFailedLogin,
} from "../auth/lockout.js";
import { createAccessToken, createRefreshToken } from "../auth/tokens.js";
import { sendEmail } from "../email/send-email.js";
import { writeAuditLog } from "../repositories/audit.js";
import {
  findUserByEmail,
  findUserById,
  sanitizeUser,
  updateUserById,
} from "../repositories/users.js";
import {
  getAdminDashboardStats,
  getDashboardSeries,
  getUserStats,
  listAdminOrders,
  listOrdersForExport,
  listUsers,
} from "../repositories/admin.js";
import type { MappedUser } from "../repositories/users.js";
import type { Id } from "../types.js";

interface AdminTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueAdminSession(userId: Id): Promise<AdminTokens> {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  await updateUserById(userId, {
    refreshToken,
    last_login_date: new Date(),
  });

  return { accessToken, refreshToken };
}

export async function adminLogin(payload: unknown) {
  const { email, password } = validate(adminLoginSchema, payload);

  const user = await findUserByEmail(email);
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (user.role !== "admin") {
    throw new HttpError(403, "Access denied. Admins only.");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "Account is not active. Contact support.");
  }

  if (isLocked(user)) {
    const seconds = lockoutSecondsRemaining(user);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    throw new HttpError(
      429,
      `Account locked due to repeated failed logins. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
  }

  const passwordMatches = await bcrypt.compare(
    String(password),
    String(user.password || "")
  );

  if (!passwordMatches) {
    await registerFailedLogin(user.id);
    throw new HttpError(401, "Invalid credentials");
  }

  await clearLoginFailures(user.id);
  const tokens = await issueAdminSession(user.id);
  const freshUser = await findUserById(user.id);

  await writeAuditLog({ adminId: user.id, action: "LOGIN", entity: "admin", detail: `Admin logged in: ${email}` });

  return {
    body: {
      message: "Login successful",
      success: true as const,
      error: false as const,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

const ADMIN_ROLES = new Set(["admin", "manager", "support"]);

export async function requireAdmin(userId: Id): Promise<MappedUser> {
  const user = await findUserById(userId);
  if (!user || !ADMIN_ROLES.has(user.role)) {
    throw new HttpError(403, "Access denied. Admins only.");
  }
  return user;
}

export async function requireSuperAdmin(userId: Id): Promise<MappedUser> {
  const user = await findUserById(userId);
  if (!user || user.role !== "admin") {
    throw new HttpError(403, "Access denied. Super admin only.");
  }
  return user;
}

export async function requireManagerOrAbove(userId: Id): Promise<MappedUser> {
  const user = await findUserById(userId);
  if (!user || !["admin", "manager"].includes(user.role)) {
    throw new HttpError(403, "Access denied. Manager access required.");
  }
  return user;
}

export async function getDashboardStats({ windowDays = 30 }: { windowDays?: number } = {}) {
  const [stats, seriesResult] = await Promise.all([
    getAdminDashboardStats(),
    getDashboardSeries({ windowDays }).catch(() => null),
  ]);
  return {
    ...stats,
    series: seriesResult,
    message: "Dashboard stats fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function getAllOrdersAdmin(params: { page?: number; perPage?: number; status?: string }) {
  const result = await listAdminOrders(params);
  return {
    ...result,
    message: "All orders fetched",
    success: true as const,
    error: false as const,
  };
}

export async function getAllUsers(params: { page?: number; perPage?: number; search?: string; segment?: string }) {
  const result = await listUsers(params);
  return {
    ...result,
    message: "Users fetched successfully",
    success: true as const,
    error: false as const,
  };
}

export async function updateUserStatus(id: Id, isActive: boolean) {
  const user = await findUserById(id);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  if (user.role === "admin") {
    throw new HttpError(403, "Cannot suspend an admin account");
  }

  const newStatus = isActive ? "active" : "Suspended";
  const updatedUser = await updateUserById(id, { status: newStatus });

  await writeAuditLog({ adminId: user.id, action: "UPDATE", entity: "user", entityId: id, detail: `Status changed to ${newStatus}` });

  return {
    message: `User ${newStatus}`,
    user: sanitizeUser(updatedUser),
    success: true as const,
    error: false as const,
  };
}

export async function bulkSetUserStatus({
  ids,
  isActive,
  adminId = null,
}: { ids: Array<Id | string | number>; isActive: boolean; adminId?: Id | null }) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "No user IDs provided");
  }
  const targets = ids
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (!targets.length) {
    throw new HttpError(400, "No valid user IDs provided");
  }

  let affected = 0;
  let skipped = 0;
  const newStatus = isActive ? "active" : "Suspended";

  for (const id of targets) {
    try {
      const user = await findUserById(id);
      if (!user) { skipped++; continue; }
      if (user.role === "admin") { skipped++; continue; }
      await updateUserById(id, { status: newStatus });
      affected++;
    } catch {
      skipped++;
    }
  }

  await writeAuditLog({
    adminId: adminId as Id,
    action: "UPDATE",
    entity: "user",
    detail: `Bulk status → ${newStatus}: ${targets.join(", ")} (affected ${affected}, skipped ${skipped})`,
  });

  return {
    success: true as const,
    error: false as const,
    message: `${affected} user${affected === 1 ? "" : "s"} ${newStatus}.${skipped > 0 ? ` ${skipped} skipped.` : ""}`,
    affected,
    skipped,
    status: newStatus,
  };
}

export async function getSingleUserStats(id: Id) {
  return {
    ...(await getUserStats(id)),
    success: true as const,
    error: false as const,
  };
}

export async function sendAdminTestEmail(to: string) {
  if (!to) {
    throw new HttpError(400, "Provide ?to=your@email.com");
  }

  await sendEmail({
    to,
    subject: "InfixMart SMTP Test",
    text: "This is a plain-text test email from InfixMart. If you see this, SMTP is working.",
    replyTo: undefined as unknown as string,
    html: `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:32px;background:#f4f6f9;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <h2 style="color:#1565C0;margin-top:0;">InfixMart SMTP Test</h2>
    <p style="color:#333;">This is a test email sent from the InfixMart backend.</p>
    <p style="color:#555;">If you are reading this, your SMTP configuration is working correctly.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
    <p style="color:#888;font-size:12px;">
      Sent at: ${new Date().toISOString()}<br/>
      SMTP Host: ${process.env.SMTP_HOST || ""}<br/>
      SMTP User: ${process.env.SMTP_USER || ""}
    </p>
  </div>
</body></html>`,
  });

  return {
    message: `Test email sent to ${to}. Check inbox (and spam folder).`,
    success: true as const,
    error: false as const,
  };
}

function escapeCsvField(val: unknown): string {
  const str = String(val ?? "").replace(/"/g, '""');
  return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
}

export async function exportOrdersCsv({
  from,
  to,
  status,
}: { from?: string; to?: string; status?: string }) {
  const rows = await listOrdersForExport({ from, to, status });

  const headers = ["Order ID", "Customer", "Email", "Status", "Payment Method", "Paid", "Items ₹", "Shipping ₹", "GST ₹", "Total ₹", "Date"];
  const lines = [headers.join(",")];

  for (const row of rows) {
    let addr: { name?: string } = {};
    try {
      addr = JSON.parse((row.shippingAddress as unknown as string) || "{}");
    } catch {}
    lines.push([
      row.id,
      escapeCsvField(row.customerName || addr.name || ""),
      escapeCsvField(row.customerEmail || ""),
      row.status,
      row.paymentMethod,
      row.isPaid ? "Yes" : "No",
      Number(row.itemsPrice || 0).toFixed(2),
      Number(row.shippingPrice || 0).toFixed(2),
      Number(row.gstAmount || 0).toFixed(2),
      Number(row.totalPrice || 0).toFixed(2),
      new Date(row.createdAt as string | Date).toISOString().slice(0, 10),
    ].join(","));
  }

  return lines.join("\n");
}

export async function exportProductsCsv({
  status,
  category,
}: { status?: string; category?: string } = {}) {
  const { listProducts } = await import("../repositories/products.js");
  const result = await listProducts({
    page: 1,
    perPage: 100000,
    status: status || "active",
    includeAllStatuses: !status,
    category: category || "",
  });

  const headers = [
    "ID", "Name", "Slug", "SKU", "Status", "Brand", "Category", "Price ₹",
    "Old Price ₹", "Discount %", "Stock", "Reorder ≤", "Rating",
    "Views", "Purchases", "Featured", "Created",
  ];
  const lines = [headers.join(",")];

  for (const p of result.products) {
    lines.push([
      p.id,
      escapeCsvField(p.name),
      escapeCsvField(p.slug || ""),
      escapeCsvField(p.sku || ""),
      p.status || "active",
      escapeCsvField(p.brand || ""),
      escapeCsvField(p.catName || ""),
      Number(p.price || 0).toFixed(2),
      Number(p.oldprice || 0).toFixed(2),
      Number(p.discount || 0),
      Number(p.countInStock || 0),
      Number(p.reorderThreshold ?? 5),
      Number(p.rating || 0),
      Number(p.viewCount || 0),
      Number(p.purchaseCount || 0),
      p.isFeatured ? "Yes" : "No",
      p.createdAt ? new Date(p.createdAt as string | Date).toISOString().slice(0, 10) : "",
    ].join(","));
  }
  return lines.join("\n");
}

export async function exportUsersCsv({ segment }: { segment?: string } = {}) {
  const { users } = await listUsers({ page: 1, perPage: 100000, search: "", segment: segment || "" });

  const headers = [
    "ID", "Name", "Email", "Mobile", "Country", "Status", "Role", "Verified",
    "Order Count", "Total Spent ₹", "Last Login", "Created",
  ];
  const lines = [headers.join(",")];

  for (const u of users) {
    lines.push([
      u.id,
      escapeCsvField(u.name || ""),
      escapeCsvField(u.email || ""),
      escapeCsvField(u.mobile || ""),
      escapeCsvField(u.country || ""),
      u.status || "active",
      u.role || "user",
      u.verify_email ? "Yes" : "No",
      Number(u.orderCount || 0),
      Number(u.totalSpent || 0).toFixed(2),
      u.last_login_date ? new Date(u.last_login_date as string | Date).toISOString().slice(0, 10) : "",
      u.createdAt ? new Date(u.createdAt as string | Date).toISOString().slice(0, 10) : "",
    ].join(","));
  }
  return lines.join("\n");
}

export async function exportCouponsCsv() {
  const { listCoupons } = await import("../repositories/coupons.js");
  const coupons = await listCoupons();

  const headers = [
    "ID", "Code", "Description", "Type", "Value", "Min Order ₹", "Max Discount ₹",
    "Usage Limit", "Usage Count", "Active", "Restriction", "Restricted Email",
    "Expires", "Created",
  ];
  const lines = [headers.join(",")];

  for (const c of coupons) {
    lines.push([
      c.id,
      escapeCsvField(c.code),
      escapeCsvField(c.description || ""),
      c.type,
      Number(c.value || 0).toFixed(2),
      Number(c.minOrderValue || 0).toFixed(2),
      c.maxDiscount != null ? Number(c.maxDiscount).toFixed(2) : "",
      c.usageLimit != null ? c.usageLimit : "",
      Number(c.usageCount || 0),
      c.isActive ? "Yes" : "No",
      escapeCsvField(c.restrictionType || ""),
      escapeCsvField(c.restrictedEmail || ""),
      c.expiresAt ? new Date(c.expiresAt as string | Date).toISOString().slice(0, 10) : "",
      c.createdAt ? new Date(c.createdAt as string | Date).toISOString().slice(0, 10) : "",
    ].join(","));
  }
  return lines.join("\n");
}
