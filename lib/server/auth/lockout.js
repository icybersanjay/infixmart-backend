import { execute } from "../db/mysql.js";

const DEFAULT_THRESHOLD = 5;
const DEFAULT_WINDOW_MIN = 15;

function getThreshold() {
  const n = Number(process.env.LOGIN_LOCKOUT_THRESHOLD);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_THRESHOLD;
}

function getWindowMs() {
  const min = Number(process.env.LOGIN_LOCKOUT_WINDOW_MIN);
  const m = Number.isFinite(min) && min > 0 ? min : DEFAULT_WINDOW_MIN;
  return Math.round(m * 60 * 1000);
}

function isLocked(user) {
  if (!user?.lockedUntil) return false;
  const until = new Date(user.lockedUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() > Date.now();
}

function lockoutSecondsRemaining(user) {
  if (!user?.lockedUntil) return 0;
  const until = new Date(user.lockedUntil);
  const diff = until.getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

async function registerFailedLogin(userId) {
  const threshold = getThreshold();
  const windowMs = getWindowMs();
  const lockUntil = new Date(Date.now() + windowMs)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await execute(
    `UPDATE Users
        SET failedLoginCount = failedLoginCount + 1,
            lastFailedLoginAt = NOW(),
            lockedUntil = CASE
              WHEN failedLoginCount + 1 >= :threshold THEN :lockUntil
              ELSE lockedUntil
            END,
            updatedAt = NOW()
      WHERE id = :userId`,
    { userId, threshold, lockUntil }
  );
}

async function clearLoginFailures(userId) {
  await execute(
    `UPDATE Users
        SET failedLoginCount = 0,
            lockedUntil = NULL,
            lastFailedLoginAt = NULL,
            updatedAt = NOW()
      WHERE id = :userId`,
    { userId }
  );
}

export {
  clearLoginFailures,
  getThreshold,
  isLocked,
  lockoutSecondsRemaining,
  registerFailedLogin,
};
