"use client";

import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineShoppingBag } from "react-icons/md";
import { FiUser, FiMail, FiLock, FiArrowRight, FiGift } from "react-icons/fi";
import { useGoogleLogin } from "@react-oauth/google";
import { postData } from "../../utils/api";
import { MyContext } from "../../LegacyProviders";
import { useForm, required, emailFormat, minLength } from "../../hooks/useForm";
import SEO from "../../components/SEO";
import Spinner from "../../components/ui/Spinner";

/* ── Input field ─────────────────────────────────────────────────────────── */
function Field({ label, icon: Icon, error, helperText, className = "", children, ...props }) {
  return (
    <div className={`w-full ${className}`}>
      <label className="block text-[12px] font-[700] text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className={`relative flex items-center border rounded-xl transition-all ${
        error
          ? "border-red-400 bg-red-50/30"
          : "border-gray-200 bg-white focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/10"
      }`}>
        {Icon && (
          <span className="pl-3.5 flex-shrink-0">
            <Icon className={`text-[16px] ${error ? "text-red-400" : "text-gray-400"}`} />
          </span>
        )}
        <input
          {...props}
          className="flex-1 h-[46px] px-3 text-[14px] bg-transparent outline-none disabled:opacity-50 pr-10"
        />
        {children}
      </div>
      {(error || helperText) && (
        <p className={`text-[11px] mt-1 font-[500] ${error ? "text-red-500" : "text-gray-400"}`}>
          {helperText || " "}
        </p>
      )}
    </div>
  );
}

/* ── Password strength bar ───────────────────────────────────────────────── */
function PasswordStrength({ value }) {
  if (!value) return null;
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
  const levels = [
    { label: "Weak",   color: "bg-red-400",    w: "w-1/4" },
    { label: "Fair",   color: "bg-orange-400",  w: "w-2/4" },
    { label: "Good",   color: "bg-yellow-400",  w: "w-3/4" },
    { label: "Strong", color: "bg-green-500",   w: "w-full" },
  ];
  const lvl = levels[score - 1];
  if (!lvl) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${lvl.color} ${lvl.w}`} />
      </div>
      <span className={`text-[10px] font-[700] ${
        score === 1 ? "text-red-500" : score === 2 ? "text-orange-500" : score === 3 ? "text-yellow-600" : "text-green-600"
      }`}>{lvl.label}</span>
    </div>
  );
}

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
        (value) => value !== formFields.password ? "Passwords do not match" : "",
      ],
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
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
        const res = await postData("/api/user/google-login", { access_token: tokenResponse.access_token });
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
    onError: () => context.openAlertBox("error", "Google sign-up was cancelled or failed."),
  });

  return (
    <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 bg-[#F0F5FF]">
      <SEO title="Create Account" url="/register" noIndex />
      <div className="w-full max-w-[440px] mx-auto px-4">

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Brand header */}
          <div className="bg-gradient-to-br from-[#1565C0] to-[#0D47A1] px-8 pt-8 pb-7 text-white">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MdOutlineShoppingBag className="text-[20px] text-white" />
              </div>
              <span className="text-[20px] font-[900] tracking-tight">InfixMart</span>
            </div>
            <h1 className="text-[22px] font-[800] leading-snug">Create your account</h1>
            <p className="text-white/70 text-[13px] mt-1">Join 10,000+ wholesale buyers across India</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            {/* Referral code banner */}
            {refCode && (
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
                <FiGift className="text-green-600 text-[16px] flex-shrink-0" />
                <p className="text-[12px] text-green-800 font-[600]">
                  Referral code <span className="font-[800] tracking-wide">{refCode}</span> applied — you'll both get rewards!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <Field
                label="Full name"
                icon={FiUser}
                type="text"
                id="name"
                name="name"
                autoComplete="name"
                value={formFields.name}
                disabled={isLoading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.name}
                helperText={errors.name}
                className="mb-4"
              />

              {/* Email */}
              <Field
                label="Email address"
                icon={FiMail}
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formFields.email}
                disabled={isLoading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.email}
                helperText={errors.email}
                className="mb-4"
              />

              {/* Password */}
              <div className="mb-4">
                <Field
                  label="Password"
                  icon={FiLock}
                  type={isShowPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  value={formFields.password}
                  disabled={isLoading}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.password}
                  helperText={errors.password}
                >
                  <button
                    type="button"
                    className="absolute right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setIsShowPassword(!isShowPassword)}
                    aria-label={isShowPassword ? "Hide password" : "Show password"}
                  >
                    {isShowPassword ? <FaRegEye className="text-[16px]" /> : <FaRegEyeSlash className="text-[16px]" />}
                  </button>
                </Field>
                <PasswordStrength value={formFields.password} />
              </div>

              {/* Confirm Password */}
              <Field
                label="Confirm password"
                icon={FiLock}
                type={isShowConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                value={formFields.confirmPassword}
                disabled={isLoading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={
                  !!errors.confirmPassword ||
                  !!(formFields.confirmPassword && formFields.password !== formFields.confirmPassword)
                }
                helperText={
                  errors.confirmPassword ||
                  (formFields.confirmPassword && formFields.password !== formFields.confirmPassword
                    ? "Passwords do not match"
                    : "")
                }
                className="mb-5"
              >
                <button
                  type="button"
                  className="absolute right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setIsShowConfirmPassword(!isShowConfirmPassword)}
                  aria-label={isShowConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {isShowConfirmPassword ? <FaRegEye className="text-[16px]" /> : <FaRegEyeSlash className="text-[16px]" />}
                </button>
              </Field>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || hasErrors}
                className="w-full h-[48px] bg-gradient-to-r from-[#1565C0] to-[#0D47A1] text-white font-[700] text-[15px] rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:from-[#0D47A1] hover:to-[#1565C0] transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <>Create account <FiArrowRight className="text-[16px]" /></>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] font-[600] text-gray-400 uppercase tracking-wider">or</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => loginWithGoogle()}
                className="w-full h-[46px] flex items-center justify-center gap-2.5 border-2 border-gray-200 rounded-xl text-[14px] font-[600] text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Spinner size={18} className="text-gray-500" />
                ) : (
                  <FcGoogle className="text-[20px]" />
                )}
                {isGoogleLoading ? "Connecting…" : "Sign up with Google"}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-[13px] text-gray-500 mt-5">
              Already have an account?{" "}
              <Link href="/login" className="font-[700] text-[#1565C0] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-6 mt-5">
          {["🔒 SSL secured", "✉️ Email verified", "🚚 Free shipping ₹999+"].map(t => (
            <span key={t} className="text-[11px] text-gray-400 font-[500]">{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Register;
