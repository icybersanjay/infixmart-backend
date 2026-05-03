import type { NextRequest } from "next/server";
import { ok, fail, handleRouteError } from "../../../lib/server/api/http.js";
import { requireAccessUserId } from "../../../lib/server/auth/session.js";
import { getReferralsByReferrer } from "../../../lib/server/repositories/referrals.js";
import { findUserById, updateUserById } from "../../../lib/server/repositories/users.js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateReferralCode(name: string): string {
  const prefix = (name || "USER").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireAccessUserId(request);
    const [referrals, userRecord] = await Promise.all([
      getReferralsByReferrer(userId),
      findUserById(userId),
    ]);
    if (!userRecord) return fail(404, "User not found");

    let referralCode = userRecord.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode(userRecord.name);
      await updateUserById(userId, { referralCode });
    }

    return ok({
      referralCode,
      walletBalance: userRecord.walletBalance,
      referrals,
      totalEarned: referrals.filter((r) => r.credited).length * 50,
      success: true,
      error: false,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
