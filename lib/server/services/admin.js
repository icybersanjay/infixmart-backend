import bcrypt from "bcryptjs";
import { HttpError } from "../api/http.js";
import { adminLoginSchema, validate } from "../api/schemas.js";
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
  getUserStats,
  listAdminOrders,
  listUsers,
} from "../repositories/admin.js";

async function issueAdminSession(userId) {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  await updateUserById(userId, {
    refreshToken,
    last_login_date: new Date(),
  });

  return { accessToken, refreshToken };
}

async function adminLogin(payload) {
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

  const passwordMatches = await bcrypt.compare(
    String(password),
    String(user.password || "")
  );

  if (!passwordMatches) {
    throw new HttpError(401, "Invalid credentials");
  }

  const tokens = await issueAdminSession(user.id);
  const freshUser = await findUserById(user.id);

  await writeAuditLog({ adminId: user.id, action: "LOGIN", entity: "admin", detail: `Admin logged in: ${email}` });

  return {
    body: {
      message: "Login successful",
      success: true,
      error: false,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

async function requireAdmin(userId) {
  const user = await findUserById(userId);
  if (!user || user.role !== "admin") {
    throw new HttpError(403, "Access denied. Admins only.");
  }

  return user;
}

async function getDashboardStats() {
  const stats = await getAdminDashboardStats();
  return {
    ...stats,
    message: "Dashboard stats fetched successfully",
    success: true,
    error: false,
  };
}

async function getAllOrdersAdmin({ page, perPage, status }) {
  const result = await listAdminOrders({ page, perPage, status });
  return {
    ...result,
    message: "All orders fetched",
    success: true,
    error: false,
  };
}

async function getAllUsers(params) {
  const result = await listUsers(params);
  return {
    ...result,
    message: "Users fetched successfully",
    success: true,
    error: false,
  };
}

async function updateUserStatus(id, isActive) {
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
    success: true,
    error: false,
  };
}

async function getSingleUserStats(id) {
  return {
    ...(await getUserStats(id)),
    success: true,
    error: false,
  };
}

async function sendAdminTestEmail(to) {
  if (!to) {
    throw new HttpError(400, "Provide ?to=your@email.com");
  }

  await sendEmail({
    to,
    subject: "InfixMart SMTP Test",
    text: "This is a plain-text test email from InfixMart. If you see this, SMTP is working.",
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
    success: true,
    error: false,
  };
}

export {
  adminLogin,
  getAllOrdersAdmin,
  getAllUsers,
  getDashboardStats,
  getSingleUserStats,
  requireAdmin,
  sendAdminTestEmail,
  updateUserStatus,
};
