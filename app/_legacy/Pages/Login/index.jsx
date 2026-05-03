"use client";

import React, { useState, useContext } from "react";
import Spinner from "../../components/ui/Spinner";

// Tiny floating-label input matching the previous MUI TextField look.
function LabeledInput({ label, error, helperText, className = "", ...props }) {
  const hasValue = props.value !== undefined && props.value !== "";
  const inputCls = `peer w-full h-[44px] px-3 pt-3 text-[14px] bg-white border rounded-md outline-none transition-colors disabled:opacity-60 ${error ? "border-[#E53935] focus:border-[#E53935]" : "border-gray-300 focus:border-[#1565C0]"}`;
  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        placeholder=" "
        className={inputCls}
      />
      <label
        htmlFor={props.id}
        className={`absolute left-3 ${hasValue ? "top-[2px] text-[10px]" : "top-1/2 -translate-y-1/2 text-[14px]"} pointer-events-none transition-all ${error ? "text-[#E53935]" : "text-gray-500 peer-focus:text-[#1565C0]"} peer-focus:top-[2px] peer-focus:-translate-y-0 peer-focus:text-[10px]`}
      >
        {label}
      </label>
      <p className={`text-[11px] mt-1 ${error ? "text-[#E53935]" : "text-gray-400"}`}>{helperText || " "}</p>
    </div>
  );
}
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
              <LabeledInput
                type="email"
                id="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                value={formFields.email}
                disabled={isLoading}
                label="Email Id"
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.email}
                helperText={errors.email}
              />
            </div>
            <div className="relative w-full mb-6 form-group">
              <LabeledInput
                type={isShowPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                value={formFields.password}
                disabled={isLoading}
                label="Password"
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.password}
                helperText={errors.password}
              />
              <button
                type="button"
                className="absolute top-[6px] right-[10px] z-50 w-[35px] h-[35px] inline-flex items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors"
                onClick={() => setIsShowPassword(!isShowPassword)}
                aria-label={isShowPassword ? "Hide password" : "Show password"}
              >
                {isShowPassword ? (
                  <FaRegEye className="text-[20px] opacity-75" />
                ) : (
                  <FaRegEyeSlash className="text-[20px] opacity-75" />
                )}
              </button>
            </div>

            <span
              className="cursor-pointer link text-[14px] font-[600]"
              onClick={forgotPassword}
            >
              Forget Password?
            </span>

            <div className="flex items-center w-full mt-2 mb-2">
              <button
                type="submit"
                disabled={isLoading || hasErrors}
                className="w-full btn-lg btn-org flex gap-3 items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? <Spinner size={20} className="text-white" /> : "Login"}
              </button>
            </div>

            <p className="mb-3 text-center">
              Not Registered?{" "}
              <Link className="link text-[14px] font-[600] text-primary" href="/register">
                Sign Up
              </Link>
            </p>

            <p className="text-center font-[500] mb-2">Or continue with social account</p>

            <button
              type="button"
              disabled={isGoogleLoading}
              className="flex w-full gap-3 bg-[#f1f1f1] btn-lg text-black items-center justify-center disabled:opacity-60"
              onClick={() => loginWithGoogle()}
            >
              {isGoogleLoading ? (
                <Spinner size={18} className="text-black" />
              ) : (
                <FcGoogle className="text-[20px]" />
              )}
              {isGoogleLoading ? "Connecting..." : "Login with Google"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
