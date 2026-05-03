// JS re-export shim — see user-auth.ts for the real implementation.
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
} from "./user-auth.ts";
