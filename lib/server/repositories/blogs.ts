import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Blog, BlogRow, Id } from "../types.js";

const BLOG_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  image,
  author,
  published,
  createdAt,
  updatedAt
`;

type BlogDbRow = BlogRow & RowDataPacket;

function mapBlog(row: BlogDbRow | undefined): Blog | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    published: Boolean(row.published),
  };
}

export interface ListBlogsResult {
  blogs: Array<Blog | null>;
  total: number;
  page: number;
  totalPages: number;
}

export async function listPublishedBlogs({
  page = 1,
  perPage = 10,
}: { page?: number; perPage?: number }): Promise<ListBlogsResult> {
  const offset = (page - 1) * perPage;
  const [countRows, blogRows] = await Promise.all([
    query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total
       FROM Blogs
       WHERE published = 1`
    ),
    query<BlogDbRow>(
      `SELECT ${BLOG_SELECT}
       FROM Blogs
       WHERE published = 1
       ORDER BY createdAt DESC
       LIMIT :limit OFFSET :offset`,
      { limit: perPage, offset }
    ),
  ]);

  const total = Number(countRows[0]?.total || 0);
  return {
    blogs: blogRows.map(mapBlog),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function findPublishedBlogBySlug(slug: string): Promise<Blog | null> {
  const rows = await query<BlogDbRow>(
    `SELECT ${BLOG_SELECT}
     FROM Blogs
     WHERE slug = :slug AND published = 1
     LIMIT 1`,
    { slug }
  );

  return mapBlog(rows[0]);
}

export async function listAllBlogs(): Promise<Array<Blog | null>> {
  const rows = await query<BlogDbRow>(
    `SELECT ${BLOG_SELECT}
     FROM Blogs
     ORDER BY createdAt DESC`
  );

  return rows.map(mapBlog);
}

export async function findBlogById(id: Id): Promise<Blog | null> {
  const rows = await query<BlogDbRow>(
    `SELECT ${BLOG_SELECT}
     FROM Blogs
     WHERE id = :id
     LIMIT 1`,
    { id }
  );

  return mapBlog(rows[0]);
}

export async function slugExists(
  slug: string,
  excludeId: Id | null = null
): Promise<boolean> {
  const rows = await query<{ id: Id } & RowDataPacket>(
    `SELECT id
     FROM Blogs
     WHERE slug = :slug
       ${excludeId ? "AND id != :excludeId" : ""}
     LIMIT 1`,
    excludeId ? { slug, excludeId } : { slug }
  );

  return Boolean(rows[0]);
}

export interface CreateBlogPayload {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  image?: string | null;
  author?: string | null;
  published?: boolean;
}

export async function createBlog(payload: CreateBlogPayload): Promise<Blog | null> {
  const result = await execute(
    `INSERT INTO Blogs (
      title,
      slug,
      excerpt,
      content,
      image,
      author,
      published,
      createdAt,
      updatedAt
    ) VALUES (
      :title,
      :slug,
      :excerpt,
      :content,
      :image,
      :author,
      :published,
      NOW(),
      NOW()
    )`,
    {
      ...payload,
      published: payload.published ? 1 : 0,
    }
  );

  return findBlogById(result.insertId);
}

export type UpdateBlogPayload = Partial<CreateBlogPayload>;

export async function updateBlog(
  id: Id,
  payload: UpdateBlogPayload
): Promise<Blog | null> {
  const serialized: Record<string, unknown> = {
    ...payload,
    published:
      payload.published === undefined ? undefined : payload.published ? 1 : 0,
  };
  const entries = Object.entries(serialized).filter(([, value]) => value !== undefined);

  if (!entries.length) {
    return findBlogById(id);
  }

  const setClause = entries.map(([key]) => `\`${key}\` = :${key}`).join(", ");
  await execute(
    `UPDATE Blogs
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id`,
    { id, ...Object.fromEntries(entries) }
  );

  return findBlogById(id);
}

export async function deleteBlogById(id: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Blogs
     WHERE id = :id`,
    { id }
  );

  return result.affectedRows > 0;
}
