import { HttpError } from "../api/http.js";
import { deleteUploadByPublicPath, saveUploadedFiles } from "../files/uploads.js";
import {
  createHomePageItem,
  deleteHomePageItem,
  findHomePageItemById,
  listAllHomePageItems,
  listHomePageItemsBySection,
  updateHomePageItem,
} from "../repositories/homepage.js";
import type { Id } from "../types.js";

function toBoolean(value: unknown, fallback: boolean = false): boolean {
  if (value === undefined) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

function serializeMeta(value: unknown, fallback: string | null = null): string | null {
  if (value === undefined) return fallback;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function getSectionItems(section: string) {
  return {
    items: await listHomePageItemsBySection(section, { activeOnly: true }),
    success: true as const,
    error: false as const,
  };
}

export async function getAllSectionsAdmin() {
  return {
    items: await listAllHomePageItems(),
    success: true as const,
    error: false as const,
  };
}

interface HomePageItemBody {
  section?: string;
  key?: string;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  link?: string | null;
  badge?: string | null;
  badgeColor?: string;
  bgColor?: string;
  textColor?: string;
  isActive?: boolean | string | number;
  order?: number | string;
  meta?: unknown;
}

export async function createHomePageItemRecord(body: HomePageItemBody) {
  if (!body.section || !body.key) {
    throw new HttpError(400, "section and key are required");
  }

  const item = await createHomePageItem({
    section: String(body.section),
    key: String(body.key),
    title: body.title ?? null,
    subtitle: body.subtitle ?? null,
    image: body.image ?? null,
    link: body.link ?? null,
    badge: body.badge ?? null,
    badgeColor: body.badgeColor || "#1565C0",
    bgColor: body.bgColor || "#1565C0",
    textColor: body.textColor || "#fff",
    isActive: toBoolean(body.isActive, true),
    order: Number(body.order ?? 0),
    meta: serializeMeta(body.meta),
  });

  return {
    item,
    message: "Item created",
    success: true as const,
    error: false as const,
  };
}

export async function updateHomePageItemRecord(id: Id, body: HomePageItemBody) {
  const existing = await findHomePageItemById(id);
  if (!existing) {
    throw new HttpError(404, "Item not found");
  }

  const nextImage = body.image !== undefined ? body.image : existing.image;
  if (existing.image && existing.image !== nextImage) {
    await deleteUploadByPublicPath(existing.image);
  }

  const item = await updateHomePageItem(id, {
    title: body.title ?? existing.title,
    subtitle: body.subtitle ?? existing.subtitle,
    image: nextImage,
    link: body.link ?? existing.link,
    badge: body.badge ?? existing.badge,
    badgeColor: body.badgeColor ?? existing.badgeColor,
    bgColor: body.bgColor ?? existing.bgColor,
    textColor: body.textColor ?? existing.textColor,
    isActive:
      body.isActive !== undefined
        ? toBoolean(body.isActive, existing.isActive)
        : existing.isActive,
    order: body.order !== undefined ? Number(body.order) : existing.order,
    meta: serializeMeta(body.meta, existing.meta),
  });

  return {
    item,
    message: "Item updated",
    success: true as const,
    error: false as const,
  };
}

export async function deleteHomePageItemRecord(id: Id) {
  const existing = await findHomePageItemById(id);
  if (!existing) {
    throw new HttpError(404, "Item not found");
  }

  if (existing.image) {
    await deleteUploadByPublicPath(existing.image);
  }

  await deleteHomePageItem(id);
  return {
    message: "Item deleted",
    success: true as const,
    error: false as const,
  };
}

export async function uploadHomePageImage(request: Request) {
  const formData = await request.formData();
  const [image] = await saveUploadedFiles(formData, "image");

  if (!image) {
    throw new HttpError(400, "No file uploaded");
  }

  return {
    image,
    success: true as const,
    error: false as const,
  };
}
