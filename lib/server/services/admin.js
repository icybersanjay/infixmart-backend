// JS re-export shim — see admin.ts for the real implementation.
export {
  adminLogin,
  bulkSetUserStatus,
  exportCouponsCsv,
  exportOrdersCsv,
  exportProductsCsv,
  exportUsersCsv,
  getAllOrdersAdmin,
  getAllUsers,
  getDashboardStats,
  getSingleUserStats,
  requireAdmin,
  requireManagerOrAbove,
  requireSuperAdmin,
  sendAdminTestEmail,
  updateUserStatus,
} from "./admin.ts";
