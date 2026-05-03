import { HttpError } from "../api/http.js";
import { deleteUploadByPublicPath } from "../files/uploads.js";
import {
  createHomeSlide,
  deleteHomeSlide,
  findHomeSlideById,
  listHomeSlides,
  updateHomeSlide,
} from "../repositories/home-slides.js";
import type { Id } from "../types.js";

function toBoolean(value: unknown, fallback: boolean = false): boolean {
  if (value === undefined) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [value].filter(Boolean);
    }
  }
  return [];
}

interface HomeSlideBody {
  images?: string[] | string;
  title?: string | null;
  link?: string | null;
  order?: number | string;
  type?: string;
  isActive?: boolean | string | number;
}

export async function getHomeSlidesPublic(params: { type?: string } = {}) {
  return {
    success: true as const,
    data: await listHomeSlides(params),
  };
}

export async function createHomeSlideRecord(body: HomeSlideBody) {
  const images = parseImages(body.images);
  if (!images.length) {
    throw new HttpError(400, "At least one image is required");
  }

  return {
    success: true as const,
    message: "Home Slide added successfully",
    data: await createHomeSlide({
      images,
      title: body.title || null,
      link: body.link || null,
      order: Number(body.order ?? 0),
      type: body.type || "main",
      isActive: toBoolean(body.isActive, true),
    }),
  };
}

export async function updateHomeSlideRecord(id: Id, body: HomeSlideBody) {
  const existing = await findHomeSlideById(id);
  if (!existing) {
    throw new HttpError(404, "Slide not found");
  }

  return {
    success: true as const,
    message: "Slide updated",
    data: await updateHomeSlide(id, {
      title: body.title,
      link: body.link,
      order: body.order !== undefined ? Number(body.order) : undefined,
      isActive:
        body.isActive !== undefined
          ? toBoolean(body.isActive, existing.isActive)
          : undefined,
      type: body.type,
    }),
  };
}

export async function deleteHomeSlideRecord(id: Id) {
  const existing = await findHomeSlideById(id);
  if (!existing) {
    throw new HttpError(404, "Home Slide not found");
  }

  for (const image of existing.images || []) {
    await deleteUploadByPublicPath(image);
  }

  await deleteHomeSlide(id);
  return {
    success: true as const,
    message: "Home Slide deleted successfully",
  };
}
