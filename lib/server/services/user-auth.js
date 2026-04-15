import bcrypt from "bcryptjs";
import crypto from "crypto";
import { HttpError } from "../api/http.js";
import { forgotPasswordSchema, registerSchema, resetPasswordSchema, userLoginSchema, validate, verifyOtpSchema } from "../api/schemas.js";
import {
  createAccessToken,
  createPasswordResetToken,
  createRefreshToken,
} from "../auth/tokens.js";
import { sendEmail } from "../email/send-email.js";
import { renderVerifyEmailTemplate } from "../email/templates/verify-email.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByRefreshToken,
  sanitizeUser,
  updateUserById,
} from "../repositories/users.js";
import { deleteUploadByPublicPath, saveUploadedFiles } from "../files/uploads.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_\-])[A-Za-z\d@$!%*#?&^_\-]{8,}$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function verifyOtp(plain, hashed) {
  if (!plain || !hashed) {
    return false;
  }

  return bcrypt.compare(String(plain), String(hashed));
}

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationOtpEmail({ email, name, otp }) {
  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: renderVerifyEmailTemplate(name, otp),
  });
}

async function issueSession(userId) {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  await updateUserById(userId, {
    refreshToken,
    last_login_date: new Date(),
  });

  return { accessToken, refreshToken };
}

async function registerUser(payload) {
  const { name, email, password } = validate(registerSchema, payload);

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new HttpError(400, "User already exists");
  }

  const otp = generateOtpCode();
  const hashedPassword = await bcrypt.hash(password, 10);

  await createUser({
    name,
    email,
    password: hashedPassword,
    otp: await hashOtp(otp),
    otp_expires: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await sendVerificationOtpEmail({ email, name, otp });
  } catch (emailError) {
    console.error("[register] Failed to send verification email:", emailError);
  }

  return {
    message:
      "User registered successfully. Please check your email to verify your account.",
    success: true,
    error: false,
  };
}

async function verifyEmail(payload) {
  const { email, otp } = validate(verifyOtpSchema, payload);
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  const isCodeValid = await verifyOtp(otp, user.otp);
  const isNotExpired = user.otp_expires && new Date(user.otp_expires) > new Date();

  if (isCodeValid && isNotExpired) {
    await updateUserById(user.id, {
      verify_email: true,
      otp: null,
      otp_expires: null,
    });

    return {
      message: "Email verified successfully",
      success: true,
      error: false,
    };
  }

  if (!isCodeValid) {
    throw new HttpError(400, "Invalid OTP");
  }

  throw new HttpError(400, "OTP Expired");
}

async function loginUser(payload) {
  const { email, password } = validate(userLoginSchema, payload);
  const user = await findUserByEmail(email);

  if (!user) {
    throw new HttpError(400, "User Not Found!");
  }

  if (user.status !== "active") {
    throw new HttpError(
      400,
      `Your account is ${user.status}. Please contact support.`
    );
  }

  if (!user.verify_email) {
    throw new HttpError(
      400,
      "Your email is not verified. Please verify your email to login."
    );
  }

  const passwordMatches = await bcrypt.compare(
    String(password || ""),
    String(user.password || "")
  );

  if (!passwordMatches) {
    throw new HttpError(400, "Invalid Credentials");
  }

  const tokens = await issueSession(user.id);
  const freshUser = await findUserById(user.id);

  return {
    body: {
      message: "Login Successful",
      success: true,
      error: false,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

async function logoutUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  await updateUserById(userId, { refreshToken: "" });

  return {
    message: "Logout Successful",
    success: true,
    error: false,
  };
}

async function refreshAccessToken(refreshToken) {
  const user = await findUserByRefreshToken(refreshToken);
  if (!user) {
    throw new HttpError(403, "Refresh token revoked");
  }

  const accessToken = createAccessToken(user.id);

  return {
    body: {
      message: "New Access Token generated",
      error: false,
      success: true,
      data: { accessToken },
    },
    tokens: { accessToken },
  };
}

async function getUserDetails(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return {
    message: "User details fetched successfully",
    success: true,
    error: false,
    user: sanitizeUser(user),
  };
}

async function updateUserDetails(userId, payload) {
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

  let verifyEmail = user.verify_email;
  let otp = null;
  let otpExpires = null;

  if (nextEmail !== user.email) {
    const verifyCode = generateOtpCode();
    otp = await hashOtp(verifyCode);
    otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    verifyEmail = false;
    await sendVerificationOtpEmail({
      email: nextEmail,
      name: nextName,
      otp: verifyCode,
    });
  }

  const passwordHash = nextPassword
    ? await bcrypt.hash(nextPassword, 10)
    : user.password;

  const updatedUser = await updateUserById(user.id, {
    name: nextName,
    email: nextEmail,
    mobile: nextMobile,
    country: nextCountry,
    password: passwordHash,
    verify_email: verifyEmail,
    otp,
    otp_expires: otpExpires,
  });

  return {
    message: "User details updated successfully",
    success: true,
    error: false,
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

async function uploadUserAvatar(userId, request) {
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
    success: true,
    error: false,
  };
}

async function deleteUserImageByQuery(request) {
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
    result: "ok",
    success: true,
    error: false,
  };
}

async function forgotPassword(payload) {
  const { email } = validate(forgotPasswordSchema, payload);
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
    success: true,
    error: false,
  };
}

async function verifyForgotPasswordCode({ email, otp }) {
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

  if (!user.otp_expires || new Date(user.otp_expires) < new Date()) {
    throw new HttpError(400, "OTP Expired");
  }

  await updateUserById(user.id, {
    otp: null,
    otp_expires: null,
  });

  return {
    body: {
      message: "OTP verified successfully",
      success: true,
      error: false,
    },
    passwordResetToken: createPasswordResetToken(user.email),
  };
}

async function resetPassword({
  email,
  oldPassword,
  newPassword,
  confirmPassword,
}) {
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
    throw new HttpError(
      400,
      "New Password and Confirm Password do not match"
    );
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
    success: true,
    error: false,
  };
}

async function resendVerificationOtp({ email }) {
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
    success: true,
    error: false,
  };
}

async function googleLogin({ access_token }) {
  if (!access_token) {
    throw new HttpError(400, "Google access token required");
  }

  const googleRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`
  );

  if (!googleRes.ok) {
    throw new HttpError(401, "Invalid Google token");
  }

  const googleData = await googleRes.json();
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
        verify_email: true,
      });
    }
  }

  const tokens = await issueSession(user.id);
  const freshUser = await findUserById(user.id);

  return {
    body: {
      message: "Login Successful",
      success: true,
      error: false,
      data: { user: sanitizeUser(freshUser) },
    },
    tokens,
  };
}

export {
  forgotPassword,
  getUserDetails,
  googleLogin,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendVerificationOtp,
  resetPassword,
  deleteUserImageByQuery,
  updateUserDetails,
  uploadUserAvatar,
  verifyEmail,
  verifyForgotPasswordCode,
};
