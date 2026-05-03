import { HttpError } from "../api/http.js";
import { sanitizeRichText, stripHtml } from "../content/html.js";
import { deleteUploadByPublicPath } from "../files/uploads.js";
import {
  createBlog,
  deleteBlogById,
  findBlogById,
  findPublishedBlogBySlug,
  listAllBlogs,
  listPublishedBlogs,
  slugExists,
  updateBlog,
} from "../repositories/blogs.js";
import type { Id } from "../types.js";

const toSlug = (value: unknown): string =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function toBoolean(value: unknown, fallback: boolean = false): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === true || value === "true" || value === 1 || value === "1";
}

async function uniqueBlogSlug(title: string, excludeId: Id | null = null): Promise<string> {
  const base = toSlug(title || "blog") || "blog";
  let slug = base;
  let counter = 1;

  while (await slugExists(slug, excludeId)) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

interface BlogBody {
  title?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  author?: string;
  published?: boolean | string | number;
}

export async function getBlogsPublic(params: { page?: number; perPage?: number }) {
  return {
    ...(await listPublishedBlogs(params)),
    success: true as const,
    error: false as const,
  };
}

export async function getBlogPublic(slug: string) {
  const blog = await findPublishedBlogBySlug(slug);
  if (!blog) {
    throw new HttpError(404, "Blog not found");
  }
  return { blog, success: true as const, error: false as const };
}

export async function getBlogsAdmin() {
  return {
    blogs: await listAllBlogs(),
    success: true as const,
    error: false as const,
  };
}

export async function createBlogRecord(body: BlogBody) {
  const title = String(body.title || "").trim();
  if (!title) {
    throw new HttpError(400, "Title is required");
  }

  const safeContent = sanitizeRichText(body.content || "");
  const safeExcerpt = stripHtml(body.excerpt || safeContent).slice(0, 220);
  const blog = await createBlog({
    title,
    slug: await uniqueBlogSlug(title),
    excerpt: safeExcerpt,
    content: safeContent,
    image: body.image || "",
    author: String(body.author || "").trim() || "InfixMart Team",
    published: toBoolean(body.published),
  });

  return {
    blog,
    message: "Blog created successfully",
    success: true as const,
    error: false as const,
  };
}

export async function updateBlogRecord(id: Id, body: BlogBody) {
  const existing = await findBlogById(id);
  if (!existing) {
    throw new HttpError(404, "Blog not found");
  }

  const nextTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
  if (!nextTitle) {
    throw new HttpError(400, "Title is required");
  }

  const nextContent =
    body.content !== undefined ? sanitizeRichText(body.content || "") : existing.content;
  const nextExcerpt =
    body.excerpt !== undefined
      ? stripHtml(body.excerpt || "").slice(0, 220)
      : existing.excerpt || stripHtml(nextContent || "").slice(0, 220);
  const nextImage =
    body.image !== undefined ? String(body.image || "") : existing.image;

  if (existing.image && existing.image !== nextImage) {
    await deleteUploadByPublicPath(existing.image);
  }

  const blog = await updateBlog(id, {
    title: nextTitle,
    slug:
      nextTitle !== existing.title
        ? await uniqueBlogSlug(nextTitle, id)
        : existing.slug,
    excerpt: nextExcerpt,
    content: nextContent,
    image: nextImage,
    author:
      body.author !== undefined
        ? String(body.author || "").trim() || "InfixMart Team"
        : existing.author,
    published:
      body.published !== undefined
        ? toBoolean(body.published, existing.published)
        : existing.published,
  });

  return {
    blog,
    message: "Blog updated successfully",
    success: true as const,
    error: false as const,
  };
}

export async function deleteBlogRecord(id: Id) {
  const blog = await findBlogById(id);
  if (!blog) {
    throw new HttpError(404, "Blog not found");
  }

  if (blog.image) {
    await deleteUploadByPublicPath(blog.image);
  }

  await deleteBlogById(id);
  return {
    message: "Blog deleted successfully",
    success: true as const,
    error: false as const,
  };
}
