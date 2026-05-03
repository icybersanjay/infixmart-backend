import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock everything `createOrderFromCheckout` reaches into. The test focus is the
// idempotency-key short-circuit at the top of the function — we don't care what
// the downstream side-effects do, only that they ARE or ARE NOT called.

vi.mock("../lib/server/db/mysql.js", () => ({
  getMysqlPool: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("../lib/server/repositories/orders.js", () => ({
  bulkUpdateOrderStatus: vi.fn(),
  createOrder: vi.fn(),
  createOrderItems: vi.fn(),
  findOrderById: vi.fn(),
  findOrderByIdempotencyKey: vi.fn(),
  findPaidOrderByPaymentId: vi.fn(),
  listAllOrders: vi.fn(),
  listOrdersByUserId: vi.fn(),
  markOrderCancelled: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock("../lib/server/repositories/cart.js", () => ({
  deleteCartItemsByIds: vi.fn(),
  listCartLinesByUserId: vi.fn(),
}));

vi.mock("../lib/server/repositories/coupons.js", () => ({
  findCouponByCode: vi.fn(),
  incrementCouponUsage: vi.fn(),
}));

vi.mock("../lib/server/repositories/products.js", () => ({
  findProductById: vi.fn(),
}));

vi.mock("../lib/server/repositories/addresses.js", () => ({
  findAddressByIdForUser: vi.fn(),
}));

vi.mock("../lib/server/repositories/users.js", () => ({
  creditWallet: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("../lib/server/repositories/referrals.js", () => ({
  getReferralByReferee: vi.fn(),
  markReferralCredited: vi.fn(),
}));

vi.mock("../lib/server/email/order-confirmation.js", () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendOrderStatusEmail: vi.fn(),
  sendNewOrderAdminEmail: vi.fn(),
}));

vi.mock("../lib/server/email/low-stock-alert.js", () => ({
  sendLowStockAlertEmail: vi.fn(),
}));

vi.mock("../lib/server/sms/fast2sms.js", () => ({
  sendOrderPlacedSms: vi.fn(),
  sendOrderShippedSms: vi.fn(),
  sendOrderDeliveredSms: vi.fn(),
}));

vi.mock("../lib/server/whatsapp/meta.js", () => ({
  sendOrderPlacedWhatsApp: vi.fn(),
  sendOrderShippedWhatsApp: vi.fn(),
  sendOrderDeliveredWhatsApp: vi.fn(),
}));

vi.mock("../lib/server/push/web-push.js", () => ({
  sendPushToUser: vi.fn(),
}));

vi.mock("../lib/server/services/invoices.js", () => ({
  ensureInvoiceNumber: vi.fn(),
}));

const ordersRepo = await import("../lib/server/repositories/orders.js");
const cartRepo = await import("../lib/server/repositories/cart.js");
const invoicesService = await import("../lib/server/services/invoices.js");
const { createOrderFromCheckout } = await import("../lib/server/services/orders.js");

// Minimal fake transaction connection. The service's `runExecute` /  `runQuery`
// helpers do `const [result] = await conn.execute(...)`, so the mock must
// return the [rows, fields] tuple shape mysql2 emits.
function fakeConn() {
  return {
    query:   vi.fn().mockResolvedValue([[], []]),
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]),
  };
}

function makeCheckout() {
  return {
    secureOrderItems: [
      { productId: 1, qty: 2, name: "Item A", price: 100 },
    ],
    shippingAddress: { name: "Test", mobile: "9000000000" },
    itemsPrice: 200,
    shippingPrice: 49,
    gstAmount: 36,
    totalPrice: 285,
    cartItemIds: [11],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createOrderFromCheckout — idempotency-key short-circuit", () => {
  it("throws when checkout has no items", async () => {
    await expect(
      createOrderFromCheckout({
        userId: 1,
        checkout: { secureOrderItems: [] },
        paymentMethod: "COD",
        conn: fakeConn(),
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(ordersRepo.findOrderByIdempotencyKey).not.toHaveBeenCalled();
    expect(ordersRepo.createOrder).not.toHaveBeenCalled();
  });

  it("returns the existing order when an idempotency key matches a prior order", async () => {
    const priorOrder = { id: 999, totalPrice: 285, status: "pending" };
    ordersRepo.findOrderByIdempotencyKey.mockResolvedValueOnce(priorOrder);
    const conn = fakeConn();

    const result = await createOrderFromCheckout({
      userId: 1,
      checkout: makeCheckout(),
      paymentMethod: "COD",
      idempotencyKey: "key-abc-123",
      conn,
    });

    expect(result).toBe(priorOrder);
    expect(ordersRepo.findOrderByIdempotencyKey).toHaveBeenCalledWith("key-abc-123", conn);
    // Crucially: nothing else should fire — no stock decrement, no createOrder,
    // no cart wipe, no invoice number issuance.
    expect(ordersRepo.createOrder).not.toHaveBeenCalled();
    expect(ordersRepo.createOrderItems).not.toHaveBeenCalled();
    expect(cartRepo.deleteCartItemsByIds).not.toHaveBeenCalled();
    expect(invoicesService.ensureInvoiceNumber).not.toHaveBeenCalled();
  });

  it("does NOT short-circuit when no idempotency key is provided", async () => {
    ordersRepo.createOrder.mockResolvedValueOnce({ id: 1 });
    ordersRepo.findOrderById.mockResolvedValueOnce({ id: 1, status: "pending" });
    const conn = fakeConn();

    await createOrderFromCheckout({
      userId: 1,
      checkout: makeCheckout(),
      paymentMethod: "COD",
      conn,
    });

    // No lookup happens when key is null/undefined.
    expect(ordersRepo.findOrderByIdempotencyKey).not.toHaveBeenCalled();
    expect(ordersRepo.createOrder).toHaveBeenCalledTimes(1);
  });

  it("proceeds normally when an idempotency key is provided but no prior order exists", async () => {
    ordersRepo.findOrderByIdempotencyKey.mockResolvedValueOnce(null);
    ordersRepo.createOrder.mockResolvedValueOnce({ id: 2 });
    ordersRepo.findOrderById.mockResolvedValueOnce({ id: 2, status: "pending" });
    const conn = fakeConn();

    const out = await createOrderFromCheckout({
      userId: 1,
      checkout: makeCheckout(),
      paymentMethod: "COD",
      idempotencyKey: "fresh-key",
      conn,
    });

    expect(ordersRepo.findOrderByIdempotencyKey).toHaveBeenCalledWith("fresh-key", conn);
    expect(ordersRepo.createOrder).toHaveBeenCalledTimes(1);
    // The new order's idempotencyKey is persisted on the order row so the next
    // call with the same key short-circuits.
    expect(ordersRepo.createOrder.mock.calls[0][0]).toMatchObject({
      idempotencyKey: "fresh-key",
    });
    expect(out).toEqual({ id: 2, status: "pending" });
  });

  it("persists totals as rounded money", async () => {
    ordersRepo.createOrder.mockResolvedValueOnce({ id: 3 });
    ordersRepo.findOrderById.mockResolvedValueOnce({ id: 3 });
    await createOrderFromCheckout({
      userId: 1,
      checkout: {
        ...makeCheckout(),
        itemsPrice: 199.999,
        shippingPrice: 49.005,
        gstAmount: 35.991,
        totalPrice: 284.99499,
      },
      paymentMethod: "COD",
      conn: fakeConn(),
    });

    const payload = ordersRepo.createOrder.mock.calls[0][0];
    expect(payload.itemsPrice).toBe(200);
    expect(payload.shippingPrice).toBe(49.01);
    expect(payload.gstAmount).toBe(35.99);
    expect(payload.totalPrice).toBe(284.99);
  });

  it("preserves the coupon code + discount in paymentResult when present", async () => {
    ordersRepo.createOrder.mockResolvedValueOnce({ id: 4 });
    ordersRepo.findOrderById.mockResolvedValueOnce({ id: 4 });
    await createOrderFromCheckout({
      userId: 1,
      checkout: {
        ...makeCheckout(),
        couponCode: "SAVE10",
        couponDiscount: 50,
        couponId: 7,
      },
      paymentMethod: "COD",
      conn: fakeConn(),
    });

    const payload = ordersRepo.createOrder.mock.calls[0][0];
    expect(payload.paymentResult).toMatchObject({
      couponCode: "SAVE10",
      couponDiscount: 50,
    });
  });
});
