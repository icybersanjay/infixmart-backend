import { HttpError } from "../api/http.js";
import { findOrderById } from "../repositories/orders.js";
import {
  createReturnRequest,
  findActiveReturnForOrder,
  findReturnById,
  listReturns,
  listReturnsByUserId,
  updateReturnStatus,
  type MappedReturn,
} from "../repositories/returns.js";
import type { Id, ReturnStatus } from "../types.js";

const RETURN_WINDOW_DAYS = 7;

interface CreateReturnBody {
  orderId?: Id | string;
  reason?: string;
}

export async function createReturnRecord(userId: Id, body: CreateReturnBody | null | undefined) {
  const orderId = Number(body?.orderId);
  const reason = String(body?.reason || "").trim();

  if (!orderId || !reason) {
    throw new HttpError(400, "orderId and reason are required");
  }

  const order = await findOrderById(orderId);
  if (!order || order.userId !== Number(userId)) {
    throw new HttpError(404, "Order not found");
  }

  if (order.status !== "delivered") {
    throw new HttpError(400, "Return requests can only be raised for delivered orders");
  }

  const deliveredAt = new Date(order.updatedAt as string | Date);
  const diffDays = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > RETURN_WINDOW_DAYS) {
    throw new HttpError(400, `Return window of ${RETURN_WINDOW_DAYS} days has expired`);
  }

  const existing = await findActiveReturnForOrder(orderId);
  if (existing) {
    throw new HttpError(400, "A return request for this order already exists");
  }

  return {
    success: true as const,
    error: false as const,
    message: "Return request submitted",
    data: await createReturnRequest({ orderId, userId, reason }),
  };
}

export async function getMyReturns(userId: Id) {
  return {
    success: true as const,
    error: false as const,
    data: await listReturnsByUserId(userId),
  };
}

export async function getAllReturnsAdmin(params: {
  page?: number;
  perPage?: number;
  status?: string;
}) {
  return {
    success: true as const,
    error: false as const,
    ...(await listReturns(params)),
  };
}

interface UpdateReturnStatusBody {
  status?: ReturnStatus | string;
  adminNote?: string;
}

export async function updateReturnStatusRecord(
  id: Id,
  body: UpdateReturnStatusBody | null | undefined
) {
  const status = body?.status;
  const validStatuses: ReadonlyArray<ReturnStatus> = ["approved", "rejected", "completed"];
  if (!validStatuses.includes(status as ReturnStatus)) {
    throw new HttpError(400, `status must be one of: ${validStatuses.join(", ")}`);
  }

  const existing = await findReturnById(id);
  if (!existing) {
    throw new HttpError(404, "Return request not found");
  }

  return {
    success: true as const,
    error: false as const,
    message: "Return status updated",
    data: await updateReturnStatus(id, {
      status: status as ReturnStatus,
      adminNote: body?.adminNote?.trim() || existing.adminNote,
    }),
  };
}

export type { MappedReturn };
