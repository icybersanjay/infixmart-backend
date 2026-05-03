// Shared row-shape types for the InfixMart database.
//
// One interface per table, mirroring the columns declared in db/schema.sql.
// Two flavours per table:
//   • <Table>Row    — the raw shape mysql2 returns (DECIMAL columns are strings,
//                     JSON columns are pre-parsed objects, TINYINT(1) booleans
//                     come back as `0 | 1` numbers).
//   • <Table>       — the mapped shape the rest of the app sees, after the
//                     repo's `mapRow()` runs (numbers coerced, JSON parsed).
//
// Keep these aligned with schema.sql when adding columns. Anything missing here
// is still allowed — repos can extend the shape via `& { extraField: ... }`.

// ── Generic helpers ──────────────────────────────────────────────────────
export type Id = number;
export type Iso = string;            // ISO datetime string
export type SqlDateTime = string | Date;
export type Json<T = unknown> = T;   // JSON column — pre-parsed by mysql2 driver
export type Bit = 0 | 1;             // TINYINT(1) raw value
export type DecimalString = string;  // mysql2 returns DECIMAL as a string by default

// ── Products ─────────────────────────────────────────────────────────────
export type ProductStatus = "draft" | "active" | "archived";

export interface PriceTier {
  /** Minimum quantity that unlocks this tier (inclusive). Tiers are matched
   *  by picking the highest minQty ≤ ordered qty. */
  minQty: number;
  /** Per-unit price at this tier, in INR. */
  price: number;
}

export interface ProductRow {
  id: Id;
  name: string;
  slug: string | null;
  sku: string | null;
  status: ProductStatus;
  description: string | null;
  images: Json<string[]> | string | null;
  brand: string | null;
  price: DecimalString | number;
  oldprice: DecimalString | number | null;
  priceTiers: Json<PriceTier[]> | string | null;
  catName: string | null;
  catId: Id | null;
  subCatId: Id | null;
  subCat: string | null;
  thirdSubCatId: Id | null;
  thirdSubCat: string | null;
  countInStock: number;
  rating: DecimalString | number;
  isFeatured: Bit;
  discount: number;
  productRam: string | null;
  size: string | null;
  productWeight: string | null;
  videoUrl: string | null;
  saleEndsAt: SqlDateTime | null;
  viewCount: number;
  purchaseCount: number;
  reorderThreshold: number;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Product extends Omit<ProductRow, "images" | "productRam" | "size" | "productWeight" | "isFeatured" | "saleEndsAt" | "viewCount" | "purchaseCount" | "reorderThreshold" | "priceTiers"> {
  _id: Id;
  status: ProductStatus;
  images: string[];
  productRam: string[];
  size: string[];
  productWeight: string[];
  priceTiers: PriceTier[];
  isFeatured: boolean;
  videoUrl: string | null;
  saleEndsAt: Iso | null;
  viewCount: number;
  purchaseCount: number;
  reorderThreshold: number;
}

// ── Orders ───────────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: Id;
  /** Variant chosen at checkout. Null when the customer bought the base SKU. */
  variantId?: Id | null;
  variantName?: string | null;
  variantSku?: string | null;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  slug?: string | null;
}

export interface ShippingAddress {
  name?: string;
  mobile?: string;
  phone?: string;
  flatHouse?: string;
  areaStreet?: string;
  landmark?: string | null;
  townCity?: string;
  city?: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  country?: string;
  address?: string;
  fullName?: string;
  addressLine?: string;
}

export interface PaymentResult {
  id?: string;
  currency?: string;
  status?: string;
  couponCode?: string;
  couponDiscount?: number;
  [key: string]: unknown;
}

export interface OrderRow {
  id: Id;
  userId: Id;
  items: Json<OrderItem[]> | string;
  shippingAddress: Json<ShippingAddress> | string;
  paymentMethod: string;
  paymentResult: Json<PaymentResult> | string | null;
  idempotencyKey: string | null;
  invoiceNumber: string | null;
  itemsPrice: DecimalString | number;
  shippingPrice: DecimalString | number;
  gstAmount: DecimalString | number;
  totalPrice: DecimalString | number;
  isPaid: Bit;
  paidAt: SqlDateTime | null;
  status: OrderStatus | string;
  trackingNumber: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  cancelledAt: SqlDateTime | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  deliveredAt?: SqlDateTime | null;
  reviewReminderSentAt?: SqlDateTime | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Order extends Omit<OrderRow, "items" | "shippingAddress" | "paymentResult" | "isPaid"> {
  _id: Id;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentResult: PaymentResult;
  isPaid: boolean;
}

// ── Users ────────────────────────────────────────────────────────────────
export type UserRole = "user" | "admin" | "manager" | "support";
export type UserStatus = "active" | "disabled" | "deleted";

export interface UserRow {
  id: Id;
  name: string;
  email: string;
  password: string | null;
  avatar: string | null;
  mobile: string | null;
  country: string;
  accessToken: string | null;
  refreshToken: string | null;
  verify_email: Bit;
  last_login_date: SqlDateTime | null;
  status: UserStatus | string;
  otp: string | null;
  otp_expires: SqlDateTime | null;
  google_id: string | null;
  role: UserRole | string;
  is_member: Bit;
  membership_started_at: SqlDateTime | null;
  rto_count: number;
  referralCode: string | null;
  referredBy: Id | null;
  walletBalance: DecimalString | number;
  failedLoginCount: number;
  lockedUntil: SqlDateTime | null;
  lastFailedLoginAt: SqlDateTime | null;
  deletedAt: SqlDateTime | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export type User = UserRow;

// ── Cart ─────────────────────────────────────────────────────────────────
export interface CartProductRow {
  id: Id;
  productId: Id;
  quantity: number;
  userId: Id;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

// The repo's listCartItemsByUserId joins Products and exposes a richer shape.
export interface CartItem {
  id: Id;
  _id: Id;
  productId: ProductLite;
  productTitle: string | null;
  image: string | null;
  rating: number;
  price: number;
  oldPrice: number;
  subTotal: number;
  quantity: number;
  size: string | null;
  productRam: string | null;
  productWeight: string | null;
  brand: string | null;
  countInStock: number;
  userId: Id;
}

export interface ProductLite {
  id: Id;
  _id: Id;
  name: string;
  slug: string | null;
  images: string[];
  price: number;
  oldPrice: number;
  countInStock: number;
}

// ── Coupons ──────────────────────────────────────────────────────────────
export type CouponType = "percent" | "flat";
export type CouponRestrictionType = "none" | "first_order" | "email";

export interface CouponRow {
  id: Id;
  code: string;
  description: string | null;
  type: CouponType | string;
  value: DecimalString | number;
  minOrderValue: DecimalString | number | null;
  maxDiscount: DecimalString | number | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: Bit;
  expiresAt: SqlDateTime | null;
  restrictionType: CouponRestrictionType | string | null;
  restrictedEmail: string | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Coupon extends Omit<CouponRow, "isActive" | "value" | "minOrderValue" | "maxDiscount"> {
  isActive: boolean;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  restrictionType: CouponRestrictionType;
}

// ── Refunds ──────────────────────────────────────────────────────────────
export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export interface RefundRow {
  id: Id;
  orderId: Id;
  userId: Id;
  amount: DecimalString | number;
  currency: string;
  razorpayPaymentId: string | null;
  razorpayRefundId: string | null;
  status: RefundStatus;
  reason: string | null;
  requestedBy: string;
  requestedById: Id | null;
  note: string | null;
  failureReason: string | null;
  createdAt: SqlDateTime;
  processedAt: SqlDateTime | null;
}

export type Refund = RefundRow;

// ── Wishlist (MyLists) ───────────────────────────────────────────────────
export interface WishlistItemRow {
  id: Id;
  productId: Id;
  userId: Id;
  productTitle: string | null;
  image: string | null;
  rating: DecimalString | number | null;
  price: DecimalString | number | null;
  oldPrice: DecimalString | number | null;
  discount: number | null;
  brand: string | null;
  backInStockNotifiedAt?: SqlDateTime | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface WishlistItem extends Omit<WishlistItemRow, "rating" | "price" | "oldPrice" | "discount"> {
  _id: Id;
  rating: number;
  price: number;
  oldPrice: number;
  discount: number;
}

// ── Addresses ────────────────────────────────────────────────────────────
export interface AddressRow {
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
  status: string;
  isDefault: Bit;
  userId: Id;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Address extends Omit<AddressRow, "isDefault"> {
  isDefault: boolean;
}

// ── Settings ─────────────────────────────────────────────────────────────
export interface SettingRow {
  id: Id;
  key: string;
  value: string | null;
  updatedAt: SqlDateTime;
}

// ── Counters (atomic invoice / sequence numbers) ─────────────────────────
export interface CounterRow {
  name: string;
  period: string;
  value: number;
  updatedAt: SqlDateTime;
}

// ── ProductVariants (C3) ─────────────────────────────────────────────────
export interface ProductVariantRow {
  id: Id;
  productId: Id;
  sku: string | null;
  name: string;
  attributes: Json<Record<string, string>> | string | null;
  price: DecimalString | number;
  stock: number;
  isActive: Bit;
  position: number;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface ProductVariant extends Omit<ProductVariantRow, "attributes" | "price" | "isActive"> {
  attributes: Record<string, string>;
  price: number;
  isActive: boolean;
}

// ── Audit ────────────────────────────────────────────────────────────────
export interface AuditRow {
  id: Id;
  adminId: Id | null;
  action: string;
  entity: string | null;
  entityId: Id | null;
  detail: string | null;
  createdAt: SqlDateTime;
}

// ── AdminAuditLog (writeAuditLog) ───────────────────────────────────────
export interface AdminAuditLogRow {
  id: Id;
  adminId: Id;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: SqlDateTime;
}

// ── AbandonedCartReminders ──────────────────────────────────────────────
export type AbandonedCartReminderStatus = "active" | "recovered" | "dismissed";

export interface AbandonedCartReminderRow {
  id: Id;
  userId: Id;
  cartSubtotal: DecimalString | number;
  cartSnapshot: Json<unknown> | string | null;
  status: AbandonedCartReminderStatus | string;
  lastEmailSentAt: SqlDateTime | null;
  lastWhatsappSentAt: SqlDateTime | null;
  emailCount: number;
  whatsappCount: number;
  detectedAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

// ── Attributes ──────────────────────────────────────────────────────────
export interface AttributeTypeRow {
  id: Id;
  name: string;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface AttributeValueRow {
  id: Id;
  attributeTypeId: Id;
  value: string;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

// ── Blogs ───────────────────────────────────────────────────────────────
export interface BlogRow {
  id: Id;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  author: string | null;
  published: Bit;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Blog extends Omit<BlogRow, "published"> {
  _id: Id;
  published: boolean;
}

// ── Categories ──────────────────────────────────────────────────────────
export interface CategoryRow {
  id: Id;
  name: string;
  images: Json<string[]> | string | null;
  parentCatName: string | null;
  parentCatId: Id | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Category extends Omit<CategoryRow, "images"> {
  _id: Id;
  images: string[];
}

// ── HomeSlides ──────────────────────────────────────────────────────────
export interface HomeSlideRow {
  id: Id;
  images: Json<string[]> | string | null;
  title: string | null;
  link: string | null;
  order: number;
  type: string | null;
  isActive: Bit;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface HomeSlide extends Omit<HomeSlideRow, "images" | "isActive"> {
  _id: Id;
  images: string[];
  isActive: boolean;
}

// ── HomePageContents ────────────────────────────────────────────────────
export interface HomePageContentRow {
  id: Id;
  section: string;
  key: string | null;
  title: string | null;
  subtitle: string | null;
  image: string | null;
  link: string | null;
  badge: string | null;
  badgeColor: string | null;
  bgColor: string | null;
  textColor: string | null;
  isActive: Bit;
  order: number;
  meta: string | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface HomePageContent extends Omit<HomePageContentRow, "isActive"> {
  _id: Id;
  isActive: boolean;
}

// ── Option lists (ProductRams / ProductSizes / ProductWeights) ──────────
export type OptionListKind = "ram" | "size" | "weight";

export interface OptionRow {
  id: Id;
  name: string;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

// ── ProductQA ───────────────────────────────────────────────────────────
export interface ProductQARow {
  id: Id;
  productId: Id;
  userId: Id;
  question: string;
  answer: string | null;
  answeredBy: Id | null;
  createdAt: SqlDateTime;
  answeredAt: SqlDateTime | null;
}

// ── ReferralLogs ────────────────────────────────────────────────────────
export interface ReferralLogRow {
  id: Id;
  referrerId: Id;
  refereeId: Id;
  orderId: Id | null;
  credited: Bit;
  creditedAt: SqlDateTime | null;
  createdAt: SqlDateTime;
}

// ── Returns ─────────────────────────────────────────────────────────────
export type ReturnStatus = "pending" | "approved" | "rejected" | "completed";

export interface ReturnRow {
  id: Id;
  orderId: Id;
  userId: Id;
  reason: string | null;
  status: ReturnStatus | string;
  adminNote: string | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

// ── Reviews ─────────────────────────────────────────────────────────────
export interface ReviewRow {
  id: Id;
  userId: Id;
  productId: Id;
  rating: DecimalString | number;
  title: string | null;
  comment: string | null;
  verified: Bit;
  images: Json<string[]> | string | null;
  createdAt: SqlDateTime;
  updatedAt: SqlDateTime;
}

export interface Review extends Omit<ReviewRow, "verified" | "images" | "rating"> {
  rating: number;
  verified: boolean;
  images: string[];
}

// ── SearchLogs ──────────────────────────────────────────────────────────
export interface SearchLogRow {
  id: Id;
  query: string;
  queryNorm: string;
  resultCount: number;
  userId: Id | null;
  ip: string | null;
  createdAt: SqlDateTime;
}

// ── WebhookEvents ───────────────────────────────────────────────────────
export type WebhookEventStatus = "received" | "processed" | "failed";

export interface WebhookEventRow {
  id: Id;
  provider: string;
  eventId: string;
  type: string;
  entityId: string | null;
  payload: Json<unknown> | string | null;
  status: WebhookEventStatus | string;
  error: string | null;
  receivedAt: SqlDateTime;
  processedAt: SqlDateTime | null;
}
