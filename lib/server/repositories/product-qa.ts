import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Id, ProductQARow, SqlDateTime } from "../types.js";

async function ensureTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS ProductQA (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      productId  INT NOT NULL,
      userId     INT NOT NULL,
      question   TEXT NOT NULL,
      answer     TEXT DEFAULT NULL,
      answeredBy INT DEFAULT NULL,
      createdAt  DATETIME NOT NULL DEFAULT NOW(),
      answeredAt DATETIME DEFAULT NULL,
      INDEX idx_product (productId),
      INDEX idx_user (userId)
    )
  `);
}

interface ProductQAJoinRow extends ProductQARow, RowDataPacket {
  askerName?: string | null;
  answererName?: string | null;
}

export interface MappedProductQA {
  id: Id;
  productId: Id;
  question: string;
  answer: string | null;
  answeredAt: SqlDateTime | null;
  createdAt: SqlDateTime;
  asker: { name: string } | null;
  answerer: { name: string } | null;
}

function mapQA(row: ProductQAJoinRow | undefined): MappedProductQA | null {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.productId,
    question: row.question,
    answer: row.answer || null,
    answeredAt: row.answeredAt || null,
    createdAt: row.createdAt,
    asker: row.askerName ? { name: row.askerName } : null,
    answerer: row.answererName ? { name: row.answererName } : null,
  };
}

export interface ListProductQAResult {
  questions: Array<MappedProductQA | null>;
  total: number;
  page: number;
  totalPages: number;
}

export async function listProductQA(
  productId: Id,
  { page = 1, perPage = 10 }: { page?: number; perPage?: number } = {}
): Promise<ListProductQAResult> {
  await ensureTable();
  const offset = (page - 1) * perPage;
  const [countRows, rows] = await Promise.all([
    query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total FROM ProductQA WHERE productId = :productId`,
      { productId }
    ),
    query<ProductQAJoinRow>(
      `SELECT pq.*, u1.name AS askerName, u2.name AS answererName
       FROM ProductQA pq
       LEFT JOIN Users u1 ON u1.id = pq.userId
       LEFT JOIN Users u2 ON u2.id = pq.answeredBy
       WHERE pq.productId = :productId
       ORDER BY pq.createdAt DESC
       LIMIT :limit OFFSET :offset`,
      { productId, limit: perPage, offset }
    ),
  ]);
  const total = Number(countRows[0]?.total || 0);
  return {
    questions: rows.map(mapQA),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function createQuestion(
  productId: Id,
  userId: Id,
  question: string
): Promise<MappedProductQA | null> {
  await ensureTable();
  const result = await execute(
    `INSERT INTO ProductQA (productId, userId, question, createdAt) VALUES (:productId, :userId, :question, NOW())`,
    { productId, userId, question }
  );
  const rows = await query<ProductQAJoinRow>(
    `SELECT pq.*, u1.name AS askerName FROM ProductQA pq LEFT JOIN Users u1 ON u1.id = pq.userId WHERE pq.id = :id`,
    { id: result.insertId }
  );
  return mapQA(rows[0]);
}

export async function answerQuestion(
  id: Id,
  answeredBy: Id,
  answer: string
): Promise<MappedProductQA | null> {
  await execute(
    `UPDATE ProductQA SET answer = :answer, answeredBy = :answeredBy, answeredAt = NOW() WHERE id = :id`,
    { id, answeredBy, answer }
  );
  const rows = await query<ProductQAJoinRow>(
    `SELECT pq.*, u1.name AS askerName, u2.name AS answererName
     FROM ProductQA pq
     LEFT JOIN Users u1 ON u1.id = pq.userId
     LEFT JOIN Users u2 ON u2.id = pq.answeredBy
     WHERE pq.id = :id`,
    { id }
  );
  return mapQA(rows[0]);
}
