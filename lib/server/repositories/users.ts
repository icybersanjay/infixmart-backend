import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, type SqlParams } from "../db/mysql.js";
import type { Id, UserRow } from "../types.js";

const USER_SELECT = `
  id,
  name,
  email,
  password,
  avatar,
  mobile,
  country,
  accessToken,
  refreshToken,
  verify_email,
  last_login_date,
  failedLoginCount,
  lockedUntil,
  lastFailedLoginAt,
  status,
  otp,
  otp_expires,
  google_id,
  role,
  is_member,
  membership_started_at,
  rto_count,
  referralCode,
  referredBy,
  walletBalance,
  childAccountId,
  dob,
  createdAt,
  updatedAt
`;

const USER_UPDATE_COLUMNS = new Set<string>([
  "name",
  "email",
  "password",
  "avatar",
  "mobile",
  "country",
  "accessToken",
  "refreshToken",
  "verify_email",
  "last_login_date",
  "failedLoginCount",
  "lockedUntil",
  "lastFailedLoginAt",
  "status",
  "otp",
  "otp_expires",
  "google_id",
  "role",
  "is_member",
  "membership_started_at",
  "rto_count",
  "referralCode",
  "referredBy",
  "walletBalance",
  "childAccountId",
  "dob",
]);

type UserDbRow = UserRow & RowDataPacket;

export interface MappedUser extends Omit<UserRow, "verify_email" | "is_member" | "walletBalance" | "rto_count" | "failedLoginCount"> {
  _id: Id;
  verify_email: boolean;
  is_member: boolean;
  walletBalance: number;
  rto_count: number;
  failedLoginCount: number;
}

export type SafeUser = Omit<MappedUser, "password" | "refreshToken" | "otp" | "otp_expires">;

function mapUserRow(row: UserDbRow | undefined): MappedUser | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    verify_email: Boolean(row.verify_email),
    is_member: Boolean(row.is_member),
    rto_count: Number(row.rto_count || 0),
    walletBalance: Number(row.walletBalance || 0),
    failedLoginCount: Number(row.failedLoginCount || 0),
    lockedUntil: row.lockedUntil || null,
    lastFailedLoginAt: row.lastFailedLoginAt || null,
    referralCode: row.referralCode || null,
    referredBy: row.referredBy || null,
  };
}

export function sanitizeUser(user: MappedUser | null): SafeUser | null {
  if (!user) {
    return null;
  }

  const { password, refreshToken, otp, otp_expires, ...safeUser } = user;
  return safeUser;
}

export async function findUserByEmail(email: string): Promise<MappedUser | null> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_SELECT} FROM Users WHERE email = :email LIMIT 1`,
    { email }
  );

  return mapUserRow(rows[0]);
}

export async function findUserById(id: Id): Promise<MappedUser | null> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_SELECT} FROM Users WHERE id = :id LIMIT 1`,
    { id }
  );

  return mapUserRow(rows[0]);
}

export async function findUserByReferralCode(referralCode: string): Promise<MappedUser | null> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_SELECT} FROM Users WHERE referralCode = :referralCode LIMIT 1`,
    { referralCode }
  );
  return mapUserRow(rows[0]);
}

export async function creditWallet(
  userId: Id,
  amount: number,
  conn?: PoolConnection | null
): Promise<void> {
  const sql = `UPDATE Users SET walletBalance = walletBalance + :amount, updatedAt = NOW() WHERE id = :userId`;
  if (conn) {
    await conn.execute<ResultSetHeader>(sql, { userId, amount } as unknown as never);
    return;
  }
  await execute(sql, { userId, amount });
}

export async function findUserByRefreshToken(refreshToken: string): Promise<MappedUser | null> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_SELECT} FROM Users WHERE refreshToken = :refreshToken LIMIT 1`,
    { refreshToken }
  );

  return mapUserRow(rows[0]);
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string | null;
  avatar?: string;
  mobile?: string | null;
  country?: string;
  accessToken?: string;
  refreshToken?: string;
  verify_email?: boolean | 0 | 1;
  last_login_date?: Date | string | null;
  status?: string;
  otp?: string | null;
  otp_expires?: Date | string | null;
  google_id?: string | null;
  role?: string;
  referralCode?: string | null;
  referredBy?: Id | null;
  childAccountId?: string | null;
  dob?: string | null;
}

export async function createUser({
  name,
  email,
  password,
  avatar = "",
  mobile = null,
  country = "",
  accessToken = "",
  refreshToken = "",
  verify_email = false,
  last_login_date = null,
  status = "active",
  otp = null,
  otp_expires = null,
  google_id = null,
  role = "user",
  referralCode = null,
  referredBy = null,
  childAccountId = null,
  dob = null,
}: CreateUserPayload): Promise<MappedUser | null> {
  const result = await execute(
    `INSERT INTO Users (
      name,
      email,
      password,
      avatar,
      mobile,
      country,
      accessToken,
      refreshToken,
      verify_email,
      last_login_date,
      status,
      otp,
      otp_expires,
      google_id,
      role,
      referralCode,
      referredBy,
      childAccountId,
      dob,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :email,
      :password,
      :avatar,
      :mobile,
      :country,
      :accessToken,
      :refreshToken,
      :verify_email,
      :last_login_date,
      :status,
      :otp,
      :otp_expires,
      :google_id,
      :role,
      :referralCode,
      :referredBy,
      :childAccountId,
      :dob,
      NOW(),
      NOW()
    )`,
    {
      name,
      email,
      password,
      avatar,
      mobile,
      country,
      accessToken,
      refreshToken,
      verify_email,
      last_login_date,
      status,
      otp,
      otp_expires,
      google_id,
      role,
      referralCode,
      referredBy,
      childAccountId,
      dob,
    }
  );

  if (!result || result.insertId == null) {
    console.error("[createUser] INSERT returned unexpected result:", result);
    throw new Error("Failed to create user: no insertId returned");
  }

  return findUserById(result.insertId);
}

export async function updateUserById(
  id: Id,
  updates: Partial<UserRow> & SqlParams
): Promise<MappedUser | null> {
  const entries = Object.entries(updates).filter(
    ([key, value]) => USER_UPDATE_COLUMNS.has(key) && value !== undefined
  );

  if (entries.length === 0) {
    return findUserById(id);
  }

  const setClause = entries
    .map(([key]) => `\`${key}\` = :${key}`)
    .join(", ");

  const params = Object.fromEntries(entries);

  await execute(
    `UPDATE Users SET ${setClause}, updatedAt = NOW() WHERE id = :id`,
    { ...params, id }
  );

  return findUserById(id);
}
