import React, { useState, useContext } from "react";
import TextField from "@mui/material/TextField";
import { Button, CircularProgress } from "@mui/material";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from "@react-oauth/google";
import { MyContext } from "../../LegacyProviders";
import { postData } from "../../utils/api";
import { useForm, required, emailFormat, minLength } from "../../hooks/useForm";
import SEO from "../../components/SEO";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isShowPassword, setIsShowPassword] = useState(false);

  const context = useContext(MyContext);
  const router = useRouter();

  const { values: formFields, errors, handleChange, handleBlur, validate, hasErrors } = useForm(
    { email: "", password: "" },
    {
      email:    [required("Email is required"), emailFormat()],
      password: [required("Password is required"), minLength(8, "Password must be at least 8 characters")],
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    postData("/api/user/login", formFields, { withCredentials: true }).then((res) => {
      setIsLoading(false);
      if (res?.error !== true) {
        context.openAlertBox("success", res?.message);
        context.setUserData(res?.data?.user);
        context.setIsLogin(true);
        router.push("/");
      } else {
        context.openAlertBox("error", res?.message);
      }
    });
  };

  const forgotPassword = () => {
    if (!formFields.email) {
      context.openAlertBox("error", "Please enter your email first");
      return;
    }

    postData("/api/user/forgot-password", { email: formFields.email }).then((res) => {
      if (res?.error === false) {
        context.openAlertBox("success", res?.message || "OTP sent");
        router.push(`/verify?email=${encodeURIComponent(formFields.email)}&actionType=forgot-password`);
      } else {
        context.openAlertBox("error", res?.message || "Something went wrong");
      }
    });
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        const res = await postData("/api/user/google-login", {
          access_token: tokenResponse.access_token,
        });
        if (res?.error !== true) {
          context.openAlertBox("success", res?.message);
          context.setUserData(res?.data?.user);
          context.setIsLogin(true);
          router.push("/");
        } else {
          context.openAlertBox("error", res?.message);
        }
      } catch {
        context.openAlertBox("error", "Google login failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      context.openAlertBox("error", "Google login was cancelled or failed.");
    },
  });

  return (
    <section className="py-10 section">
      <SEO title="Login" url="/login" noIndex />
      <div className="container">
        <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card">
          <h3 className="text-center text-[18px] text-black">
            Login to your account
          </h3>

          <form className="w-full mt-5" onSubmit={handleSubmit}>
            <div className="w-full mb-6 form-group">
              <TextField
                type="email"
                id="email"
                name="email"
                value={formFields.email}
                disabled={isLoading}
                label="Email Id"
                variant="outlined"
                className="w-full"
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.email}
                helperText={errors.email || " "}
              />
            </div>
            <div className="relative w-full mb-6 form-group">
              <TextField
                type={isShowPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formFields.password}
                disabled={isLoading}
                label="Password"
                variant="outlined"
                className="w-full"
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.password}
                helperText={errors.password || " "}
              />
              <Button
                className="!absolute top-[10px] right-[10px] z-50 !w-[35px] !h-[35px] !min-w-[35px] !rounded-full !text-black"
                onClick={() => setIsShowPassword(!isShowPassword)}
                type="button"
                aria-label={isShowPassword ? "Hide password" : "Show password"}
              >
                {isShowPassword ? (
                  <FaRegEye className="text-[20px] opacity-75" />
                ) : (
                  <FaRegEyeSlash className="text-[20px] opacity-75" />
                )}
              </Button>
            </div>

            <span
              className="cursor-pointer link text-[14px] font-[600]"
              onClick={forgotPassword}
            >
              Forget Password?
            </span>

            <div className="flex items-center w-full mt-2 mb-2">
              <Button
                type="submit"
                disabled={isLoading || hasErrors}
                className="w-full btn-lg btn-org flex gap-3"
              >
                {isLoading ? <CircularProgress size={20} color="inherit" /> : "Login"}
              </Button>
            </div>

            <p className="mb-3 text-center">
              Not Registered?{" "}
              <Link className="link text-[14px] font-[600] text-primary" href="/register">
                Sign Up
              </Link>
            </p>

            <p className="text-center font-[500] mb-2">Or continue with social account</p>

            <Button
              type="button"
              disabled={isGoogleLoading}
              className="flex w-full gap-3 !bg-[#f1f1f1] btn-lg !text-black"
              onClick={() => loginWithGoogle()}
            >
              {isGoogleLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <FcGoogle className="text-[20px]" />
              )}
              {isGoogleLoading ? "Connecting..." : "Login with Google"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
