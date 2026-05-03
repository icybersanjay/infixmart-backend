import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocked seam: the refunds service hits the Razorpay client + repos. We mock
// each so the tests can exercise the validation gates and state transitions
// without DB or network.

vi.mock("../lib/server/repositories/refunds.js", () => ({
  createRefund:           vi.fn(),
  findRefundByRazorpayId: vi.fn(),
  listRefundsByOrderId:   vi.fn(),
  updateRefund:           vi.fn(),
}));

vi.mock("../lib/server/repositories/orders.js", () => ({
  findOrderById:      vi.fn(),
  markOrderRefunded:  vi.fn(),
}));

vi.mock("../lib/server/services/payments.js", () => ({
  getRazorpayClient: vi.fn(),
}));

vi.mock("../lib/server/services/orders.js", () => ({
  restoreStockForOrder: vi.fn(),
  // Real implementation — keeps math deterministic.
  roundMoney: (v) => Math.round(Number(v || 0) * 100) / 100,
}));

vi.mock("../lib/server/db/mysql.js", () => ({
  // afterRefundCompleted opens a transaction for full refunds; the connection
  // mock no-ops everything since the per-step calls are also mocked.
  getMysqlPool: vi.fn(() => ({
    getConnection: vi.fn(async () => ({
      beginTransaction: vi.fn(),
      commit:           vi.fn(),
      rollback:         vi.fn(),
      release:          vi.fn(),
    })),
  })),
}));

const refundsRepo = await import("../lib/server/repositories/refunds.js");
const ordersRepo  = await import("../lib/server/repositories/orders.js");
const payments    = await import("../lib/server/services/payments.js");
const ordersSvc   = await import("../lib/server/services/orders.js");
const { requestRefund } = await import("../lib/server/services/refunds.js");

function makePaidRazorpayOrder(overrides = {}) {
  return {
    id: 100,
    userId: 7,
    isPaid: true,
    paymentMethod: "Razorpay",
    totalPrice: 1000,
    items: [{ productId: 1, qty: 2 }],
    paymentResult: { id: "pay_ABC123", currency: "INR" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  refundsRepo.listRefundsByOrderId.mockResolvedValue([]);
});

describe("requestRefund — guard rails", () => {
  it("throws 404 when the order is missing", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(null);
    await expect(requestRefund({ orderId: 1, amount: 100 })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 400 when the order has not been paid", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ isPaid: false })
    );
    await expect(requestRefund({ orderId: 1, amount: 100 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/not paid/i),
    });
  });

  it("throws 400 when the payment method is not refundable (e.g. COD)", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ paymentMethod: "COD" })
    );
    await expect(requestRefund({ orderId: 1, amount: 100 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/not supported.*COD/i),
    });
  });

  it("throws 400 when the razorpay payment id is missing on the order", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ paymentResult: {} })
    );
    await expect(requestRefund({ orderId: 1, amount: 100 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/razorpay payment id/i),
    });
  });

  it("rejects a non-positive refund amount", async () => {
    ordersRepo.findOrderById
      .mockResolvedValueOnce(makePaidRazorpayOrder())
      .mockResolvedValueOnce(makePaidRazorpayOrder());
    await expect(requestRefund({ orderId: 1, amount: 0 })).rejects.toMatchObject({
      status: 400,
    });
    await expect(requestRefund({ orderId: 1, amount: -50 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects when the requested refund would exceed total paid", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 1000 })
    );
    refundsRepo.listRefundsByOrderId.mockResolvedValueOnce([
      { amount: 700, status: "completed" },
    ]);
    await expect(
      requestRefund({ orderId: 1, amount: 500 })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/exceed/i),
    });
  });

  it("excludes failed refunds from the refunded-so-far running total", async () => {
    // 1000 total, 200 already-completed + 500 failed → request another 800 → OK
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 1000 })
    );
    refundsRepo.listRefundsByOrderId.mockResolvedValueOnce([
      { amount: 200, status: "completed" },
      { amount: 500, status: "failed" },
    ]);
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 1 });
    refundsRepo.updateRefund.mockResolvedValueOnce({ id: 1, status: "processing" });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: { refund: vi.fn().mockResolvedValueOnce({ id: "rfnd_X", status: "processing" }) },
    });

    await expect(
      requestRefund({ orderId: 1, amount: 800 })
    ).resolves.toMatchObject({ id: 1 });
  });

  it("defaults amount to remaining-balance when none is passed", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 1000 })
    );
    refundsRepo.listRefundsByOrderId.mockResolvedValueOnce([
      { amount: 300, status: "completed" },
    ]);
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 2 });
    refundsRepo.updateRefund.mockResolvedValueOnce({ id: 2, status: "processing" });
    const refundCall = vi.fn().mockResolvedValueOnce({ id: "rfnd_Y", status: "processing" });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: { refund: refundCall },
    });

    await requestRefund({ orderId: 1 });

    // Remaining = 1000 - 300 = 700 → razorpay sees 700 * 100 = 70000 paise
    expect(refundCall).toHaveBeenCalledWith("pay_ABC123", expect.objectContaining({
      amount: 70000,
    }));
  });
});

describe("requestRefund — Razorpay interaction", () => {
  it("marks the refund row failed and surfaces 502 when Razorpay rejects the call", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(makePaidRazorpayOrder());
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 5 });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: {
        refund: vi.fn().mockRejectedValueOnce({
          error: { description: "amount exceeds payment value" },
        }),
      },
    });

    await expect(
      requestRefund({ orderId: 1, amount: 100 })
    ).rejects.toMatchObject({ status: 502 });

    expect(refundsRepo.updateRefund).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        status: "failed",
        failureReason: expect.stringMatching(/amount exceeds/i),
      })
    );
  });

  it("transitions the refund row to 'completed' when Razorpay returns 'processed'", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 100 })
    );
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 6 });
    refundsRepo.updateRefund.mockResolvedValueOnce({
      id: 6, amount: 100, status: "completed",
    });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: {
        refund: vi.fn().mockResolvedValueOnce({
          id: "rfnd_Z", status: "processed",
        }),
      },
    });

    const out = await requestRefund({ orderId: 1, amount: 100 });
    expect(out.status).toBe("completed");

    // Full refund on a 100 total → markOrderRefunded should fire.
    expect(ordersRepo.markOrderRefunded).toHaveBeenCalledWith(100, expect.anything());
  });

  it("does NOT mark the order refunded when only a partial amount is processed", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 1000 })
    );
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 7 });
    refundsRepo.updateRefund.mockResolvedValueOnce({
      id: 7, amount: 300, status: "completed",
    });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: {
        refund: vi.fn().mockResolvedValueOnce({
          id: "rfnd_W", status: "processed",
        }),
      },
    });

    await requestRefund({ orderId: 1, amount: 300 });

    expect(ordersRepo.markOrderRefunded).not.toHaveBeenCalled();
  });

  it("restocks order items when restockItems=true on a completed refund", async () => {
    ordersRepo.findOrderById.mockResolvedValueOnce(
      makePaidRazorpayOrder({ totalPrice: 100 })
    );
    refundsRepo.createRefund.mockResolvedValueOnce({ id: 8 });
    refundsRepo.updateRefund.mockResolvedValueOnce({
      id: 8, amount: 100, status: "completed",
    });
    payments.getRazorpayClient.mockReturnValueOnce({
      payments: {
        refund: vi.fn().mockResolvedValueOnce({
          id: "rfnd_V", status: "processed",
        }),
      },
    });

    await requestRefund({ orderId: 1, amount: 100, restockItems: true });

    expect(ordersSvc.restoreStockForOrder).toHaveBeenCalledWith(
      [{ productId: 1, qty: 2 }],
      expect.anything()
    );
  });
});
