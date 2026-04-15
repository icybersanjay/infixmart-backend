import { execute, query } from "../db/mysql.js";

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
  status,
  otp,
  otp_expires,
  google_id,
  role,
  createdAt,
  updatedAt
`;

const USER_UPDATE_COLUMNS = new Set([
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
  "status",
  "otp",
  "otp_expires",
  "google_id",
  "role",
]);

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    verify_email: Boolean(row.verify_email),
  };
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, refreshToken, otp, otp_expires, ...safeUser } = user;
  return safeUser;
}

async function findUserByEmail(email) {
  const rows = await query(
    `SELECT ${USER_SELECT} FROM Users WHERE email = :email LIMIT 1`,
    { email }
  );

  return mapUserRow(rows[0]);
}

async function findUserById(id) {
  const rows = await query(
    `SELECT ${USER_SELECT} FROM Users WHERE id = :id LIMIT 1`,
    { id }
  );

  return mapUserRow(rows[0]);
}

async function findUserByRefreshToken(refreshToken) {
  const rows = await query(
    `SELECT ${USER_SELECT} FROM Users WHERE refreshToken = :refreshToken LIMIT 1`,
    { refreshToken }
  );

  return mapUserRow(rows[0]);
}

async function createUser({
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
}) {
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
    }
  );

  if (!result || result.insertId == null) {
    console.error("[createUser] INSERT returned unexpected result:", result);
    throw new Error("Failed to create user: no insertId returned");
  }

  return findUserById(result.insertId);
}

async function updateUserById(id, updates) {
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

export {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByRefreshToken,
  sanitizeUser,
  updateUserById,
};
