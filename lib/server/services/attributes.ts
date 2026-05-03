import { HttpError } from "../api/http.js";
import {
  createAttributeType,
  createAttributeValue,
  deleteAttributeType,
  deleteAttributeValue,
  findAttributeTypeById,
  findAttributeTypeByName,
  findAttributeValueById,
  listAttributeTypes,
  listAttributeValues,
  updateAttributeType,
} from "../repositories/attributes.js";
import type { Id } from "../types.js";

export async function getAttributeTypes() {
  return { success: true as const, data: await listAttributeTypes() };
}

export async function addAttributeType(body: { name?: string } | null | undefined) {
  const name = String(body?.name || "").trim();
  if (!name) {
    throw new HttpError(400, "Name is required");
  }

  if (await findAttributeTypeByName(name)) {
    throw new HttpError(409, "Attribute type already exists");
  }

  return {
    success: true as const,
    data: { ...(await createAttributeType(name)), values: [] },
  };
}

export async function editAttributeType(
  id: Id,
  body: { name?: string } | null | undefined
) {
  const name = String(body?.name || "").trim();
  if (!name) {
    throw new HttpError(400, "Name is required");
  }

  const type = await findAttributeTypeById(id);
  if (!type) {
    throw new HttpError(404, "Not found");
  }

  const existing = await findAttributeTypeByName(name);
  if (existing && String(existing.id) !== String(id)) {
    throw new HttpError(409, "Attribute type name already exists");
  }

  return { success: true as const, data: await updateAttributeType(id, name) };
}

export async function removeAttributeType(id: Id) {
  const type = await findAttributeTypeById(id);
  if (!type) {
    throw new HttpError(404, "Not found");
  }

  await deleteAttributeType(id);
  return { success: true as const, message: "Deleted" };
}

export async function getAttributeValues(id: Id) {
  return { success: true as const, data: await listAttributeValues(id) };
}

export async function addAttributeTypeValue(
  id: Id,
  body: { value?: string } | null | undefined
) {
  const value = String(body?.value || "").trim();
  if (!value) {
    throw new HttpError(400, "Value is required");
  }

  const type = await findAttributeTypeById(id);
  if (!type) {
    throw new HttpError(404, "Attribute type not found");
  }

  return {
    success: true as const,
    data: await createAttributeValue(id, value),
  };
}

export async function removeAttributeTypeValue(valueId: Id) {
  const value = await findAttributeValueById(valueId);
  if (!value) {
    throw new HttpError(404, "Not found");
  }

  await deleteAttributeValue(valueId);
  return { success: true as const, message: "Deleted" };
}
