"use client";

import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Spinner from "../../components/ui/Spinner";

function LabeledInput({ label, error, helperText, className = "", ...props }) {
  const hasValue = props.value !== undefined && props.value !== "";
  const inputCls = `peer w-full h-[44px] px-3 pt-3 text-[14px] bg-white border rounded-md outline-none transition-colors disabled:opacity-60 ${error ? "border-[#E53935] focus:border-[#E53935]" : "border-gray-300 focus:border-[#1565C0]"}`;
  return (
    <div className={`relative ${className}`}>
      <input {...props} placeholder=" " className={inputCls} />
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
import { postData } from "../../utils/api";
import { MyContext } from "../../LegacyProviders";
import { useForm, required, emailFormat, minLength } from "../../hooks/useForm";
import SEO from "../../components/SEO";

const Register = () => {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);

  const context = useContext(MyContext);
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref.toUpperCase().trim());
  }, [searchParams]);

  const { values: formFields, errors, handleChange, handleBlur, validate, hasErrors } = useForm(
    { name: "", email: "", password: "", confirmPassword: "" },
    {
      name:            [required("Name is required"), minLength(2, "Name must be at least 2 characters")],
      email:           [required("Email is required"), emailFormat()],
      password:        [required("Password is required"), minLength(8, "Password must be at least 8 characters")],
      confirmPassword: [
        required("Please confirm your password"),
        (value, allValues) =>
          value !== formFields.password ? "Passwords do not match" : "",
      ],
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    // Manual check for password match since useForm validators don't receive allValues yet
    if (formFields.password !== formFields.confirmPassword) {
      context.openAlertBox("error", "Passwords do not match");
      return;
    }
    if (!validate()) return;
    setIsLoading(true);

    const { confirmPassword, ...payload } = formFields;
    if (refCode) payload.referralCode = refCode;
    postData("/api/user/register", payload).then((res) => {
      setIsLoading(false);
      if (res?.error !== true) {
        context.openAlertBox("success", res?.message);
        router.push(`/verify?email=${encodeURIComponent(formFields.email)}`);
      } else {
        context.openAlertBox("error", res?.message);
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
        context.openAlertBox("error", "Google sign-up failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      context.openAlertBox("error", "Google sign-up was cancelled or failed.");
    },
  });

  return (
    <section className="py-10 section">
      <SEO title="Register" url="/register" noIndex />
      <div className="container">
        <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card">
          <h3 className="text-center text-[18px] text-black">
            Register with a new account
          </h3>

          <form className="w-full mt-5" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="w-full mb-6 form-group">
              <LabeledInput
                type="text" id="name" name="name" autoComplete="name"
                value={formFields.name} disabled={isLoading} label="Full Name"
                onChange={handleChange} onBlur={handleBlur}
                error={!!errors.name} helperText={errors.name}
              />
            </div>

            {/* Email */}
            <div className="w-full mb-6 form-group">
              <LabeledInput
                type="email" id="email" name="email" autoComplete="email" inputMode="email"
                value={formFields.email} disabled={isLoading} label="Email Id"
                onChange={handleChange} onBlur={handleBlur}
                error={!!errors.email} helperText={errors.email}
              />
            </div>

            {/* Password */}
            <div className="relative w-full mb-6 form-group">
              <LabeledInput
                type={isShowPassword ? "text" : "password"}
                id="password" name="password" autoComplete="new-password"
                value={formFields.password} disabled={isLoading} label="Password"
                onChange={handleChange} onBlur={handleBlur}
                error={!!errors.password} helperText={errors.password}
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

            {/* Confirm Password */}
            <div className="relative w-full mb-6 form-group">
              <LabeledInput
                type={isShowConfirmPassword ? "text" : "password"}
                id="confirmPassword" name="confirmPassword" autoComplete="new-password"
                value={formFields.confirmPassword} disabled={isLoading} label="Confirm Password"
                onChange={handleChange} onBlur={handleBlur}
                error={
                  !!errors.confirmPassword ||
                  (!!(formFields.confirmPassword && formFields.password !== formFields.confirmPassword))
                }
                helperText={
                  errors.confirmPassword ||
                  (formFields.confirmPassword && formFields.password !== formFields.confirmPassword
                    ? "Passwords do not match"
                    : "")
                }
              />
              <button
                type="button"
                className="absolute top-[6px] right-[10px] z-50 w-[35px] h-[35px] inline-flex items-center justify-center rounded-full text-black hover:bg-gray-100 transition-colors"
                onClick={() => setIsShowConfirmPassword(!isShowConfirmPassword)}
                aria-label={isShowConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {isShowConfirmPassword ? (
                  <FaRegEye className="text-[20px] opacity-75" />
                ) : (
                  <FaRegEyeSlash className="text-[20px] opacity-75" />
                )}
              </button>
            </div>

            <div className="flex items-center w-full mt-2 mb-2">
              <button
                type="submit"
                disabled={isLoading || hasErrors}
                className="w-full btn-lg btn-org flex gap-3 items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? <Spinner size={20} className="text-white" /> : "Register"}
              </button>
            </div>

            <p className="mb-3 text-center">
              Already have an account?{" "}
              <Link className="link text-[14px] font-[600] text-primary" href="/login">
                Login
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
              {isGoogleLoading ? "Connecting..." : "Sign up with Google"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
