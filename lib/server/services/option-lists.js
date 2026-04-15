import { HttpError } from "../api/http.js";
import {
  createOption,
  deleteOption,
  findOptionByName,
  listOptions,
} from "../repositories/option-lists.js";

function labelFor(kind) {
  if (kind === "ram") return "Product Color";
  if (kind === "size") return "Product Size";
  if (kind === "weight") return "Product Weight";
  return "Item";
}

async function getOptions(kind) {
  return { success: true, data: await listOptions(kind) };
}

async function addOption(kind, body) {
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

async function removeOption(kind, id) {
  const deleted = await deleteOption(kind, id);
  if (!deleted) {
    throw new HttpError(404, `${labelFor(kind)} not found`);
  }

  return {
    success: true,
    message: `${labelFor(kind)} deleted successfully`,
  };
}

export { addOption, getOptions, removeOption };
