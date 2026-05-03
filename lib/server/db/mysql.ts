import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

function requireEnv(name: string, { allowEmpty = false } = {}): string {
  const value = process.env[name];
  if (value === undefined || value === null || (!allowEmpty && value === "")) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface PoolHolder {
  pool: Pool | null;
}

const globalState: PoolHolder =
  (globalThis as unknown as { __infixmartMysqlPool?: PoolHolder })
    .__infixmartMysqlPool ||
  ((globalThis as unknown as { __infixmartMysqlPool: PoolHolder })
    .__infixmartMysqlPool = { pool: null });

export function getMysqlPool(): Pool {
  if (!globalState.pool) {
    globalState.pool = mysql.createPool({
      host: requireEnv("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      database: requireEnv("DB_NAME"),
      user: requireEnv("DB_USER"),
      password: requireEnv("DB_PASSWORD", { allowEmpty: true }),
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
      queueLimit: 0,
      namedPlaceholders: true,
      charset: "utf8mb4",
    });
  }

  return globalState.pool;
}

export type SqlParams = Record<string, unknown>;

/**
 * Run a SELECT and return rows. Type the row shape at the call site:
 *   const rows = await query<ProductRow>("SELECT * FROM Products LIMIT 10");
 */
export async function query<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: SqlParams = {}
): Promise<T[]> {
  // mysql2's typed `query<T>` expects positional values; we use named-placeholder
  // mode via the pool config, so cast through unknown to satisfy the overload.
  const result = await getMysqlPool().query<T[]>(sql, params as unknown as never);
  if (!result || !Array.isArray(result)) {
    console.error(
      "[db:query] Unexpected result from pool.query:",
      result,
      "SQL:",
      sql.slice(0, 100)
    );
    return [];
  }
  const rows = result[0];
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/**
 * Run an INSERT/UPDATE/DELETE and return the result header (insertId, affectedRows).
 */
export async function execute(
  sql: string,
  params: SqlParams = {}
): Promise<ResultSetHeader> {
  const result = await getMysqlPool().execute<ResultSetHeader>(sql, params as unknown as never);
  if (!result || !Array.isArray(result)) {
    console.error(
      "[db:execute] Unexpected result from pool.execute:",
      result,
      "SQL:",
      sql.slice(0, 100)
    );
    throw new Error("Database execute returned unexpected result");
  }
  return result[0];
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getMysqlPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
