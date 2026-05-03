import { HttpError } from "../api/http.js";
import {
  createOption,
  deleteOption,
  findOptionByName,
  listOptions,
  type MappedOption,
} from "../repositories/option-lists.js";
import type { Id, OptionListKind } from "../types.js";

function labelFor(kind: OptionListKind): string {
  if (kind === "ram") return "Product Color";
  if (kind === "size") return "Product Size";
  if (kind === "weight") return "Product Weight";
  return "Item";
}

export async function getOptions(
  kind: OptionListKind
): Promise<{ success: true; data: MappedOption[] }> {
  return { success: true, data: await listOptions(kind) };
}

export async function addOption(
  kind: OptionListKind,
  body: { name?: string } | null | undefined
): Promise<{ success: true; message: string; data: MappedOption | null }> {
  const name = String(body?.name || "").trim();
  if (!name) {
    throw new HttpError(400, `${labelFor(kind)} name is required`);
  }

  if (await findOptionByName(kind, name)) {
    throw new HttpError(400, `${labelFor(kind)} already exists`);
  }

  return {
    success: true,
    message: `${labelFor(kind)} created successfully`,
    data: await createOption(kind, name),
  };
}

export async function removeOption(
  kind: OptionListKind,
  id: Id
): Promise<{ success: true; message: string }> {
  const deleted = await deleteOption(kind, id);
  if (!deleted) {
    throw new HttpError(404, `${labelFor(kind)} not found`);
  }

  return {
    success: true,
    message: `${labelFor(kind)} deleted successfully`,
  };
}
