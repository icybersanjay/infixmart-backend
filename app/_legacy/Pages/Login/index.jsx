"use client";

import React, { useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineShoppingBag } from "react-icons/md";
import { FiMail, FiLock, FiArrowRight } from "react-icons/fi";
import { useGoogleLogin } from "@react-oauth/google";
import { MyContext } from "../../LegacyProviders";
import { postData } from "../../utils/api";
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
        error ? "border-red-400 bg-red-50/30" : "border-gray-200 bg-white focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/10"
      }`}>
        {Icon && (
          <span className="pl-3.5 flex-shrink-0">
            <Icon className={`text-[16px] ${error ? "text-red-400" : "text-gray-400"}`} />
          </span>
        )}
        <input
          {...props}
          className={`flex-1 h-[46px] px-3 text-[14px] bg-transparent outline-none disabled:opacity-50 ${props.type === 'password' ? 'pr-10' : ''}`}
        />
        {children}
      </div>
      {(error || helperText) && (
        <p className={`text-[11px] mt-1 font-[500] ${error ? "text-red-500" : "text-gray-400"}`}>
          {helperText || " "}
        </p>
      )}
    </div>
  );
}

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
        context.openAlertBox("error", "Google login failed. Please try again.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => context.openAlertBox("error", "Google login was cancelled or failed."),
  });

  return (
    <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 lg:py-16 bg-[#F5F8FF] px-4">
      <SEO title="Login" url="/login" noIndex />
      <div className="w-full max-w-[1000px] bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side: Premium Info Panel */}
        <div className="w-full md:w-[45%] bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#1E88E5] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle overlay shape for depth */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            {/* Brand Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <MdOutlineShoppingBag className="text-[22px] text-white" />
              </div>
              <span className="text-[22px] font-[900] tracking-tight">InfixMart</span>
            </div>

            <h2 className="text-[26px] sm:text-[32px] font-[900] leading-tight mb-4 tracking-tight">
              India's Premier Wholesale Hub
            </h2>
            <p className="text-white/85 text-[14px] leading-relaxed mb-8 font-[500]">
              Unlock factory-direct bulk pricing, verified suppliers, and seamless bulk ordering.
            </p>

            {/* Feature List */}
            <div className="flex flex-col gap-5">
              {[
                { icon: "🏷️", title: "Factory-Direct Pricing", desc: "Bulk products starting from ₹29" },
                { icon: "🚚", title: "Free Shipping Above ₹999", desc: "Delivered straight to your shop doorstep" },
                { icon: "🛡️", title: "DPDPA 2023 Compliant", desc: "Your data is strictly processed with consent" },
              ].map((f, i) => (
                <div key={i} className="flex gap-3.5 items-start">
                  <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[16px] backdrop-blur-sm flex-shrink-0">
                    {f.icon}
                  </span>
                  <div>
                    <h4 className="text-[13.5px] font-[700] text-white">{f.title}</h4>
                    <p className="text-white/70 text-[12px] mt-0.5 font-[500]">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer of panel */}
          <div className="mt-12 relative z-10 pt-6 border-t border-white/15">
            <p className="text-[11.5px] text-white/60 font-[500] leading-relaxed">
              Join 10,000+ wholesale buyers scaling their margins daily across India.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[360px] mx-auto">
            <div className="mb-8">
              <h1 className="text-[24px] font-[800] text-gray-900 leading-snug">Welcome back</h1>
              <p className="text-gray-500 text-[13.5px] mt-1 font-[500]">Sign in to your wholesale account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {/* Email */}
              <Field
                label="Email address"
                icon={FiMail}
                type="email"
                id="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                value={formFields.email}
                disabled={isLoading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.email}
                helperText={errors.email}
              />

              {/* Password */}
              <div className="relative">
                <Field
                  label="Password"
                  icon={FiLock}
                  type={isShowPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={formFields.password}
                  disabled={isLoading}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.password}
                  helperText={errors.password}
                >
                  <button
                    type="button"
                    className="absolute right-3.5 top-[37px] text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setIsShowPassword(!isShowPassword)}
                    aria-label={isShowPassword ? "Hide password" : "Show password"}
                  >
                    {isShowPassword ? <FaRegEye className="text-[16px]" /> : <FaRegEyeSlash className="text-[16px]" />}
                  </button>
                </Field>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end -mt-1.5">
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="text-[12px] font-[700] text-[#1565C0] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || hasErrors}
                className="w-full h-[48px] mt-2 bg-gradient-to-r from-[#1565C0] to-[#0D47A1] text-white font-[700] text-[15px] rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:from-[#0D47A1] hover:to-[#1565C0] transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <>Sign in <FiArrowRight className="text-[16px]" /></>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <span className="flex-1 h-px bg-gray-150" />
                <span className="text-[11px] font-[700] text-gray-400 uppercase tracking-wider">or</span>
                <span className="flex-1 h-px bg-gray-150" />
              </div>

              {/* Google */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={() => loginWithGoogle()}
                className="w-full h-[46px] flex items-center justify-center gap-2.5 border-2 border-gray-200 rounded-xl text-[14px] font-[700] text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <Spinner size={18} className="text-gray-500" />
                ) : (
                  <FcGoogle className="text-[20px]" />
                )}
                {isGoogleLoading ? "Connecting…" : "Continue with Google"}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-[13.5px] text-gray-500 mt-6 font-[500]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-[750] text-[#1565C0] hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Login;
