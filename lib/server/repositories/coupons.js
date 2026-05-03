// JS re-export shim — see coupons.ts for the real implementation.
export {
  createCoupon,
  deleteCoupon,
  findCouponByCode,
  findCouponById,
  incrementCouponUsage,
  listCoupons,
  updateCoupon,
} from "./coupons.ts";
