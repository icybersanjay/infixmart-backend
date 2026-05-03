import bcrypt from "bcryptjs";
import crypto from "crypto";
import { HttpError } from "../api/http.js";
import { forgotPasswordSchema, registerSchema, resetPasswordSchema, userLoginSchema, validate, verifyOtpSchema } from "../api/schemas.js";
import {
  clearLoginFailures,
  isLocked,
  lockoutSecondsRemaining,
  registerFailedLogin,
} from "../auth/lockout.js";
import {
  createAccessToken,
  createPasswordResetToken,
  createRefreshToken,
} from "../auth/tokens.js";
import { sendEmail } from "../email/send-email.js";
import { renderVerifyEmailTemplate } from "../email/templates/verify-email.js";
import {
  createUser,
  creditWallet,
  findUserByEmail,
  findUserById,
  findUserByReferralCode,
  findUserByRefreshToken,
  sanitizeUser,
  updateUserById,
  type MappedUser,
} from "../repositories/users.js";
import { logReferral } from "../repositories/referrals.js";
import { deleteUploadByPublicPath, saveUploadedFiles } from "../files/uploads.js";
import type { Id } from "../types.js";

const PASSWORD_RE =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_\-])[A-Za-z\d@$!%*#?&^_\-]{8,}$/;

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase();
}

async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(plain: unknown, hashed: unknown): Promise<boolean> {
  if (!plain || !hashed) return false;
  return bcrypt.compare(String(plain), String(hashed));
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface VerificationOtpEmail {
  email: string;
  name: string;
  otp: string;
}

async function sendVerificationOtpEmail({ email, name, otp }: VerificationOtpEmail): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: renderVerifyEmailTemplate(name, otp),
    replyTo: undefined as unknown as string,
  });
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function issueSession(userId: Id): Promise<AuthTokens> {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  await updateUserById(userId, {
    refreshToken,
    last_login_date: new Date(),
  });

  return { accessToken, refreshToken };
}

function generateReferralCode(name: string): string {
  const prefix = (name || "USER").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase().padEnd(4, "X");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
  referralCode?: string;
}

export async function registerUser(payload: RegisterPayload | unknown) {
  const { name, email, password, referralCode: refCode } = validate(registerSchema, payload) as RegisterPayload;

  const existingUser = await findUserByEmail(email!);
  if (existingUser) {
    throw new HttpError(400, "User already exists");
  }

  const otp = generateOtpCode();
  const hashedPassword = await bcrypt.hash(password!, 10);
  const referralCode = generateReferralCode(name!);

  let referredBy: Id | null = null;
  if (refCode) {
    const referrer = await findUserByReferralCode(String(refCode).toUpperCase().trim());
    if (referrer) referredBy = referrer.id;
  }

  const newUser = await createUser({
    name: name!,
    email: email!,
    password: hashedPassword,
    otp: await hashOtp(otp),
    otp_expires: new Date(Date.now() + 10 * 60 * 1000),
    referralCode,
    referredBy,
  });

  if (referredBy && newUser?.id) {
    logReferral(referredBy, newUser.id).catch(() => null);
    creditWallet(newUser.id, 50).catch(() => null);
  }

  try {
    await sendVerificationOtpEmail({ email: email!, name: name!, otp });
  } catch (emailError) {
    console.error("[register] Failed to send verification email:", emailError);
  }

  return {
    message:
      "User registered successfully. Please check your email to verify your account.",
    success: true as const,
    error: false as const,
  };
}

export async function verifyEmail(payload: unknown) {
  const { email, otp } = validate(verifyOtpSchema, payload) as { email: string; otp: string };
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  const isCodeValid = await verifyOtp(otp, user.otp);
  const isNotExpired = user.otp_expires && new Date(user.otp_expires as string | Date) > new Date();

  if (isCodeValid && isNotExpired) {
    await updateUserById(user.id, {
      verify_email: 1,
      otp: null,
      otp_expires: null,
    });

    return {
      message: "Email verified successfully",
      success: true as const,
      error: false as const,
    };
  }

  if (!isCodeValid) {
    throw new HttpError(400, "Invalid OTP");
  }

  throw new HttpError(400, "OTP Expired");
}

export async function loginUser(payload: unknown) {
  const { email, password } = validate(userLoginSchema, payload) as { email: string; password: string };
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  if (user.status !== "active") {
    throw new HttpError(400, `Your account is ${user.status}. Please contact support.`);
  }

  if (isLocked(user)) {
    const seconds = lockoutSecondsRemaining(user);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    throw new HttpError(
      429,
      `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
  }

  if (!user.verify_email) {
    throw new HttpError(400, "Your email is not verified. Please verify your email to login.");
  }

  const passwordMatches = await bcrypt.compare(
    String(password || ""),
    String(user.password || "")
  );

  if (!passwordMatches) {
    await registerFailedLogin(user.id);
    throw new HttpError(400, "Invalid Credentials");
  }

  await clearLoginFailures(user.id);
  const tokens = await issueSession(user.id);
  const freshUser = await findUserById(user.id);

  return {
    body: {
      message: "Login Successful",
      success: true as const,
      error: false as const,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

export async function logoutUser(userId: Id) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await updateUserById(userId, { refreshToken: "" });

  return {
    message: "Logout Successful",
    success: true as const,
    error: false as const,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const user = await findUserByRefreshToken(refreshToken);
  if (!user) {
    throw new HttpError(403, "Refresh token revoked");
  }

  const accessToken = createAccessToken(user.id);

  return {
    body: {
      message: "New Access Token generated",
      error: false as const,
      success: true as const,
      data: { accessToken },
    },
    tokens: { accessToken },
  };
}

export async function getUserDetails(userId: Id) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return {
    message: "User details fetched successfully",
    success: true as const,
    error: false as const,
    user: sanitizeUser(user),
  };
}

interface UpdateUserPayload {
  name?: string;
  email?: string;
  mobile?: string | null;
  country?: string;
  password?: string;
}

export async function updateUserDetails(userId: Id, payload: UpdateUserPayload | null | undefined) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const nextName = String(payload?.name || "").trim();
  const nextEmail = normalizeEmail(payload?.email || user.email);
  const nextMobile = payload?.mobile ?? null;
  const nextCountry = payload?.country ?? user.country ?? "";
  const nextPassword = payload?.password ? String(payload.password) : null;

  if (!nextName) {
    throw new HttpError(400, "name field required");
  }

  if (!nextEmail) {
    throw new HttpError(400, "email field required");
  }

  const existingEmailUser = await findUserByEmail(nextEmail);
  if (existingEmailUser && existingEmailUser.id !== user.id) {
    throw new HttpError(400, "User already exists");
  }

  let verifyEmailFlag: boolean = Boolean(user.verify_email);
  let otp: string | null = null;
  let otpExpires: Date | null = null;

  if (nextEmail !== user.email) {
    const verifyCode = generateOtpCode();
    otp = await hashOtp(verifyCode);
    otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    verifyEmailFlag = false;
    await sendVerificationOtpEmail({
      email: nextEmail,
      name: nextName,
      otp: verifyCode,
    });
  }

  const passwordHash = nextPassword
    ? await bcrypt.hash(nextPassword, 10)
    : user.password;

  const updatedUser = (await updateUserById(user.id, {
    name: nextName,
    email: nextEmail,
    mobile: nextMobile,
    country: nextCountry,
    password: passwordHash,
    verify_email: (verifyEmailFlag ? 1 : 0) as 0 | 1,
    otp,
    otp_expires: otpExpires,
  })) as MappedUser;

  return {
    message: "User details updated successfully",
    success: true as const,
    error: false as const,
    user: {
      name: updatedUser.name,
      _id: updatedUser.id,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      country: updatedUser.country,
      avatar: updatedUser.avatar,
    },
  };
}

export async function uploadUserAvatar(userId: Id, request: Request) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const formData = await request.formData();
  const [avatarUrl] = await saveUploadedFiles(formData, "avatar");
  if (!avatarUrl) {
    throw new HttpError(400, "No avatar provided");
  }

  if (user.avatar && user.avatar.startsWith("/uploads/")) {
    await deleteUploadByPublicPath(user.avatar);
  }

  await updateUserById(userId, { avatar: avatarUrl });

  return {
    _id: userId,
    avatar: avatarUrl,
    message: "Image uploaded successfully",
    success: true as const,
    error: false as const,
  };
}

export async function deleteUserImageByQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const imgPath = searchParams.get("img");
  if (!imgPath) {
    throw new HttpError(400, "img query param required");
  }

  if (!imgPath.startsWith("/uploads/")) {
    throw new HttpError(400, "Invalid path");
  }

  await deleteUploadByPublicPath(imgPath);

  return {
    result: "ok" as const,
    success: true as const,
    error: false as const,
  };
}

export async function forgotPassword(payload: unknown) {
  const { email } = validate(forgotPasswordSchema, payload) as { email: string };
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  const otp = generateOtpCode();
  await updateUserById(user.id, {
    otp: await hashOtp(otp),
    otp_expires: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendVerificationOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });
  } catch (emailError) {
    console.error("[forgot-password] Failed to send email:", emailError);
  }

  return {
    message: "Please check your email to reset your password.",
    success: true as const,
    error: false as const,
  };
}

export async function verifyForgotPasswordCode({ email, otp }: { email?: string; otp?: string }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !otp) {
    throw new HttpError(400, "Email and OTP are required");
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  if (!(await verifyOtp(otp, user.otp))) {
    throw new HttpError(400, "Invalid OTP");
  }

  if (!user.otp_expires || new Date(user.otp_expires as string | Date) < new Date()) {
    throw new HttpError(400, "OTP Expired");
  }

  await updateUserById(user.id, {
    otp: null,
    otp_expires: null,
  });

  return {
    body: {
      message: "OTP verified successfully",
      success: true as const,
      error: false as const,
    },
    passwordResetToken: createPasswordResetToken(user.email),
  };
}

interface ResetPasswordArgs {
  email?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export async function resetPassword({
  email,
  oldPassword,
  newPassword,
  confirmPassword,
}: ResetPasswordArgs) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !newPassword || !confirmPassword) {
    throw new HttpError(
      400,
      "Email, New Password and Confirm Password are required"
    );
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  if (!PASSWORD_RE.test(newPassword)) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters and include a letter, a number, and a special character"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new HttpError(400, "New Password and Confirm Password do not match");
  }

  if (oldPassword) {
    const passwordMatches = await bcrypt.compare(
      String(oldPassword),
      String(user.password || "")
    );

    if (!passwordMatches) {
      throw new HttpError(400, "Invalid Old Password");
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserById(user.id, {
    password: passwordHash,
    otp: null,
    otp_expires: null,
  });

  return {
    message: "Password reset successfully",
    success: true as const,
    error: false as const,
  };
}

export async function resendVerificationOtp({ email }: { email?: string }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new HttpError(400, "Email is required");
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  if (user.verify_email) {
    throw new HttpError(400, "Email is already verified");
  }

  const otp = generateOtpCode();
  await updateUserById(user.id, {
    otp: await hashOtp(otp),
    otp_expires: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendVerificationOtpEmail({
      email: user.email,
      name: user.name,
      otp,
    });
  } catch (emailError) {
    console.error("[resend-otp] Failed to send email:", emailError);
  }

  return {
    message: "Verification OTP resent successfully",
    success: true as const,
    error: false as const,
  };
}

interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
  id?: string;
}

export async function googleLogin({ access_token }: { access_token?: string }) {
  if (!access_token) {
    throw new HttpError(400, "Google access token required");
  }

  const googleRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`
  );

  if (!googleRes.ok) {
    throw new HttpError(401, "Invalid Google token");
  }

  const googleData = (await googleRes.json()) as GoogleProfile;
  const { email, name, picture, id: googleId } = googleData;

  if (!email) {
    throw new HttpError(401, "Could not retrieve email from Google");
  }

  let user = await findUserByEmail(normalizeEmail(email));

  if (!user) {
    user = await createUser({
      name: name || email.split("@")[0],
      email: normalizeEmail(email),
      password: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
      avatar: picture || "",
      verify_email: true,
      google_id: googleId,
      status: "active",
    });
  } else {
    if (user.status !== "active") {
      throw new HttpError(
        400,
        `Your account is ${user.status}. Please contact support.`
      );
    }

    if (!user.google_id) {
      user = await updateUserById(user.id, {
        google_id: googleId,
        verify_email: 1,
      });
    }
  }

  const tokens = await issueSession(user!.id);
  const freshUser = await findUserById(user!.id);

  return {
    body: {
      message: "Login Successful",
      success: true as const,
      error: false as const,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

// Re-export so the JS shim can pull resetPasswordSchema for callers that
// import schemas through this service (the original .js wired this up by side
// effect via the import; preserve the surface).
export { resetPasswordSchema };
