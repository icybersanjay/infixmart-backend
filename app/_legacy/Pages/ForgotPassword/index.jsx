import React, { useState, useContext } from "react";
import TextField from "@mui/material/TextField";
import { Button, CircularProgress } from "@mui/material";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MyContext } from "../../LegacyProviders";
import { postData } from "../../utils/api";
import SEO from "../../components/SEO";

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowPassword2, setIsShowPassword2] = useState(false);
  const [formFields, setFormFields] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const context = useContext(MyContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const onChangeInput = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
  };

  // Redirect if no email in state (user navigated directly without OTP flow)
  if (!email) {
    return (
      <section className="py-10 section">
        <SEO title="Reset Password" url="/forgot-password" noIndex />
        <div className="container">
          <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card text-center">
            <p className="text-red-500 mb-4">Session expired. Please start the password reset again.</p>
            <Link href="/login" className="link text-primary font-[600]">Back to Login</Link>
          </div>
        </div>
      </section>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword } = formFields;

    if (!newPassword) {
      context.openAlertBox("error", "New password is required");
      return;
    }
    if (newPassword.length < 8) {
      context.openAlertBox("error", "Password must be at least 8 characters");
      return;
    }
    if (!confirmPassword) {
      context.openAlertBox("error", "Please confirm your password");
      return;
    }
    if (newPassword !== confirmPassword) {
      context.openAlertBox("error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    postData("/api/user/reset-password", { email, newPassword, confirmPassword }).then((res) => {
      if (!res.error) {
        context.openAlertBox("success", res?.message);
        router.push("/login");
      } else {
        context.openAlertBox("error", res?.message);
        setIsLoading(false);
      }
    });
  };

  return (
    <section className="py-10 section">
      <SEO title="Reset Password" url="/forgot-password" noIndex />
      <div className="container">
        <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card">
          <h3 className="text-center text-[18px] text-black mb-1">
            Reset Password
          </h3>
          <p className="text-center text-[13px] text-gray-500 mb-5">
            Setting new password for{" "}
            <span className="font-semibold text-primary">{email}</span>
          </p>

          <form className="w-full" onSubmit={handleSubmit}>
            {/* New Password */}
            <div className="relative w-full mb-6 form-group">
              <TextField
                type={isShowPassword ? "text" : "password"}
                id="newPassword"
                label="New Password"
                variant="outlined"
                className="w-full"
                name="newPassword"
                value={formFields.newPassword}
                disabled={isLoading}
                onChange={onChangeInput}
              />
              <Button
                type="button"
                className="!absolute top-[10px] right-[10px] z-50 !w-[35px] !h-[35px] !min-w-[35px] !rounded-full !text-black"
                onClick={() => setIsShowPassword(!isShowPassword)}
                aria-label={isShowPassword ? "Hide password" : "Show password"}
              >
                {isShowPassword ? (
                  <FaRegEye className="text-[20px] opacity-75" />
                ) : (
                  <FaRegEyeSlash className="text-[20px] opacity-75" />
                )}
              </Button>
            </div>

            {/* Confirm Password */}
            <div className="relative w-full mb-6 form-group">
              <TextField
                type={isShowPassword2 ? "text" : "password"}
                id="confirmPassword"
                label="Confirm Password"
                variant="outlined"
                className="w-full"
                name="confirmPassword"
                value={formFields.confirmPassword}
                disabled={isLoading}
                onChange={onChangeInput}
                error={!!(formFields.confirmPassword && formFields.newPassword !== formFields.confirmPassword)}
                helperText={
                  formFields.confirmPassword && formFields.newPassword !== formFields.confirmPassword
                    ? "Passwords do not match"
                    : " "
                }
              />
              <Button
                type="button"
                className="!absolute top-[10px] right-[10px] z-50 !w-[35px] !h-[35px] !min-w-[35px] !rounded-full !text-black"
                onClick={() => setIsShowPassword2(!isShowPassword2)}
                aria-label={isShowPassword2 ? "Hide confirm password" : "Show confirm password"}
              >
                {isShowPassword2 ? (
                  <FaRegEye className="text-[20px] opacity-75" />
                ) : (
                  <FaRegEyeSlash className="text-[20px] opacity-75" />
                )}
              </Button>
            </div>

            <div className="flex items-center w-full mt-2 mb-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-lg btn-org flex gap-3"
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : "Change Password"}
              </Button>
            </div>

            <p className="text-center mt-2">
              <Link href="/login" className="link text-[14px] font-[600] text-primary">
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;
