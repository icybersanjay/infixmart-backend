import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { sequelize } from "../config/connectDB.js";
import { Op } from "sequelize";
import sendEmail from "../config/emailService.js";
import bcrypt from "bcryptjs";
import generateAccessToken from "../utils/generateAccessToken.js";
import generateRefreshToken from "../utils/generateRefreshToken.js";
import { createAuthCookieOptions } from "../utils/authCookies.js";

// ── Admin Login — returns tokens in body (Bearer auth for admin panel) ─────────
export const adminLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required", error: true, success: false });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials", error: true, success: false });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only.", error: true, success: false });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is not active. Contact support.", error: true, success: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials", error: true, success: false });
    }

    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    await User.update({ last_login_date: new Date() }, { where: { id: user.id } });

    const { password: _pw, otp: _otp, refreshToken: _rt, ...safeUser } = user.toJSON();

    res.cookie("accessToken", accessToken, createAuthCookieOptions(15 * 60 * 1000));
    res.cookie("refreshToken", refreshToken, createAuthCookieOptions(7 * 24 * 60 * 60 * 1000));

    return res.status(200).json({
      message: "Login successful",
      success: true,
      error: false,
      data: { user: safeUser },
    });
  } catch (error) {
    console.error("[adminLogin] error:", error?.message, error?.stack);
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalProducts, revenueResult] = await Promise.all([
      Order.count(),
      User.count(),
      Product.count(),
      Order.findAll({
        attributes: [[sequelize.fn("SUM", sequelize.col("totalPrice")), "totalRevenue"]],
        raw: true,
      }),
    ]);

    const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue) || 0;

    return res.status(200).json({
      totalOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      message: "Dashboard stats fetched successfully",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

export const getAllOrdersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const totalOrders = await Order.count({ where });
    const totalPages = Math.ceil(totalOrders / perPage);

    const orders = await Order.findAll({
      where,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * perPage,
      limit: perPage,
    });

    // Attach user name + email to each order
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ["id", "name", "email"],
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));

    const ordersWithUser = orders.map((o) => ({
      ...o.toJSON(),
      user: userMap[o.userId] || null,
    }));

    return res.status(200).json({
      orders: ordersWithUser,
      totalPages,
      page,
      totalOrders,
      message: "All orders fetched",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 20;

    const where = {};
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const totalUsers = await User.count({ where });
    const totalPages = Math.ceil(totalUsers / perPage) || 1;

    const users = await User.findAll({
      where,
      attributes: { exclude: ["password", "accessToken", "refreshToken", "otp", "otp_expires"] },
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * perPage,
      limit: perPage,
    });

    return res.status(200).json({ users, totalPages, page, totalUsers, message: "Users fetched successfully", success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const newStatus = isActive ? "active" : "Suspended";

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found", error: true, success: false });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot suspend an admin account", error: true, success: false });

    await user.update({ status: newStatus });
    return res.status(200).json({ message: `User ${newStatus}`, user, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;
    const [orderCount, revenueResult] = await Promise.all([
      Order.count({ where: { userId: id } }),
      Order.findAll({
        where: { userId: id },
        attributes: [[sequelize.fn("SUM", sequelize.col("totalPrice")), "totalSpent"]],
        raw: true,
      }),
    ]);
    const totalSpent = parseFloat(revenueResult[0]?.totalSpent) || 0;
    return res.status(200).json({ orderCount, totalSpent, success: true, error: false });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};

// ── Test-email — admin only, remove after smoke testing ──────────────────────
export const sendTestEmail = async (req, res) => {
  try {
    const { to } = req.query;
    if (!to) {
      return res.status(400).json({ message: "Provide ?to=your@email.com", error: true, success: false });
    }

    const result = await sendEmail(
      to,
      "InfixMart SMTP Test ✓",
      "This is a plain-text test email from InfixMart. If you see this, SMTP is working.",
      `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:32px;background:#f4f6f9;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <h2 style="color:#1565C0;margin-top:0;">InfixMart SMTP Test</h2>
    <p style="color:#333;">This is a test email sent from the InfixMart backend.</p>
    <p style="color:#555;">If you are reading this, your SMTP configuration is working correctly.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
    <p style="color:#888;font-size:12px;">
      Sent at: ${new Date().toISOString()}<br/>
      SMTP Host: ${process.env.SMTP_HOST}<br/>
      SMTP User: ${process.env.SMTP_USER}
    </p>
  </div>
</body></html>`
    );

    if (!result.success) {
      return res.status(500).json({ message: "Email failed: " + result.error, error: true, success: false });
    }

    return res.status(200).json({
      message: `Test email sent to ${to}. Check inbox (and spam folder).`,
      messageId: result.messageId,
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: true, success: false });
  }
};
