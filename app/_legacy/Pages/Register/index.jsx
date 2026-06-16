"use client";

import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineShoppingBag } from "react-icons/md";
import { FiUser, FiMail, FiLock, FiArrowRight, FiGift, FiCalendar } from "react-icons/fi";
import { useGoogleLogin } from "@react-oauth/google";
import { postData } from "../../utils/api";
import { MyContext } from "../../LegacyProviders";
import { useForm, required, emailFormat, minLength } from "../../hooks/useForm";
import SEO from "../../components/SEO";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";

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

  // Parental Consent States
  const [showParentalModal, setShowParentalModal] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [parentOtp, setParentOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [consentId, setConsentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [parentalLoading, setParentalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const context = useContext(MyContext);
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref.toUpperCase().trim());
  }, [searchParams]);

  const { values: formFields, errors, handleChange, handleBlur, validate, hasErrors } = useForm(
    { name: "", email: "", password: "", confirmPassword: "", dob: "" },
    {
      name:            [required("Name is required"), minLength(2, "Name must be at least 2 characters")],
      email:           [required("Email is required"), emailFormat()],
      password:        [required("Password is required"), minLength(8, "Password must be at least 8 characters")],
      confirmPassword: [
        required("Please confirm your password"),
        (value) => value !== formFields.password ? "Passwords do not match" : "",
      ],
      dob:             [required("Date of birth is required")],
    }
  );

  const registerAccount = async (childAccountId = null) => {
    const { confirmPassword, ...payload } = formFields;
    if (refCode) payload.referralCode = refCode;
    if (childAccountId) payload.childAccountId = childAccountId;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formFields.password !== formFields.confirmPassword) {
      context.openAlertBox("error", "Passwords do not match");
      return;
    }
    if (!validate()) return;
    setIsLoading(true);

    try {
      // 1. Verify Age via DPDPA Shield Age Gate API
      const randomSessionId = (typeof window.crypto.randomUUID === "function")
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const apiKey = process.env.NEXT_PUBLIC_DPDPA_API_KEY || "dpdpa_live_28a9865b72750ec6b30219365a70cdf32db4d700553ef911";

      const response = await fetch("https://api.dpdpashield.in/api/v1/children/age-gate/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify({
          sessionId: randomSessionId,
          dob: formFields.dob
        })
      });

      if (!response.ok) {
        throw new Error("Age gate check failed");
      }

      const ageGateResult = await response.json();

      if (ageGateResult.requiresParentalConsent) {
        setIsLoading(false);
        setSessionId(randomSessionId);
        setShowParentalModal(true);
        setOtpSent(false);
        setModalError("");
        return;
      }

      // No parental consent needed (18+), proceed with standard registration
      await registerAccount(null);

    } catch (err) {
      setIsLoading(false);
      context.openAlertBox("error", "Age gate verification failed. Please try again.");
    }
  };

  const handleInitiateParentalConsent = async () => {
    if (!guardianEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      setModalError("Please enter a valid guardian email address.");
      return;
    }
    setParentalLoading(true);
    setModalError("");

    try {
      // Compute SHA-256 hash of child email
      const childEmail = formFields.email.trim().toLowerCase();
      const msgBuffer = new TextEncoder().encode(childEmail);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const dataPrincipalHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const apiKey = process.env.NEXT_PUBLIC_DPDPA_API_KEY || "dpdpa_live_28a9865b72750ec6b30219365a70cdf32db4d700553ef911";

      const res = await fetch("https://api.dpdpashield.in/api/v1/children/parental-consent/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify({
          sessionId,
          guardianEmail,
          dataPrincipalHash,
          dob: formFields.dob
        })
      });

      if (!res.ok) {
        throw new Error("Verification code trigger failed");
      }

      const data = await res.json();
      if (data.consentId) {
        setConsentId(data.consentId);
        setOtpSent(true);
      } else {
        throw new Error("Missing consentId from response");
      }
    } catch (err) {
      setModalError("Failed to send verification code. Please try again.");
    } finally {
      setParentalLoading(false);
    }
  };

  const handleVerifyParentalConsent = async () => {
    if (!parentOtp || parentOtp.length < 4) {
      setModalError("Please enter a valid verification code.");
      return;
    }
    setParentalLoading(true);
    setModalError("");

    try {
      const apiKey = process.env.NEXT_PUBLIC_DPDPA_API_KEY || "dpdpa_live_28a9865b72750ec6b30219365a70cdf32db4d700553ef911";

      const res = await fetch("https://api.dpdpashield.in/api/v1/children/parental-consent/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        },
        body: JSON.stringify({
          consentId,
          otp: parentOtp
        })
      });

      if (!res.ok) {
        throw new Error("Invalid parental verification code");
      }

      const data = await res.json();
      if (data.childAccountId) {
        setShowParentalModal(false);
        setIsLoading(true);
        await registerAccount(data.childAccountId);
      } else {
        throw new Error("Missing childAccountId");
      }
    } catch (err) {
      setModalError("Invalid verification code. Please check and try again.");
    } finally {
      setParentalLoading(false);
    }
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
    <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 lg:py-16 bg-[#F5F8FF] px-4">
      <SEO title="Create Account" url="/register" noIndex />
      <div className="w-full max-w-[1000px] bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[650px]">
        
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
              Create Your Partner Account
            </h2>
            <p className="text-white/85 text-[14px] leading-relaxed mb-8 font-[500]">
              Join 10,000+ verified retail businesses sourcing smarter every day.
            </p>

            {/* Feature List */}
            <div className="flex flex-col gap-5">
              {[
                { icon: "🎁", title: "Referral & Member Rewards", desc: "Get ₹50 instantly on signup with code" },
                { icon: "🛡️", title: "Safe & Compliant Processing", desc: "Your personal data is protected under DPDPA Section 9" },
                { icon: "⚡", title: "Instant Verification", desc: "Verify quickly and start shopping immediately" },
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
              Verify your email address after registration to activate wholesale benefits.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-[420px] mx-auto">
            <div className="mb-6">
              <h1 className="text-[24px] font-[800] text-gray-900 leading-snug">Create account</h1>
              <p className="text-gray-500 text-[13.5px] mt-1 font-[500]">Join India's wholesale marketplace</p>
            </div>

            {/* Referral code banner */}
            {refCode && (
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4">
                <FiGift className="text-green-600 text-[15px] flex-shrink-0" />
                <p className="text-[12px] text-green-800 font-[600]">
                  Referral code <span className="font-[800] tracking-wide">{refCode}</span> applied!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
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
              />

              {/* Date of Birth */}
              <Field
                label="Date of birth"
                icon={FiCalendar}
                type="date"
                id="dob"
                name="dob"
                value={formFields.dob}
                disabled={isLoading}
                onChange={handleChange}
                onBlur={handleBlur}
                error={!!errors.dob}
                helperText={errors.dob || "Required under DPDPA 2023 for age gating"}
              />

              {/* Password */}
              <div className="relative">
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
                    className="absolute right-3.5 top-[37px] text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setIsShowPassword(!isShowPassword)}
                    aria-label={isShowPassword ? "Hide password" : "Show password"}
                  >
                    {isShowPassword ? <FaRegEye className="text-[16px]" /> : <FaRegEyeSlash className="text-[16px]" />}
                  </button>
                </Field>
                <PasswordStrength value={formFields.password} />
              </div>

              {/* Confirm Password */}
              <div className="relative">
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
                >
                  <button
                    type="button"
                    className="absolute right-3.5 top-[37px] text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setIsShowConfirmPassword(!isShowConfirmPassword)}
                    aria-label={isShowConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {isShowConfirmPassword ? <FaRegEye className="text-[16px]" /> : <FaRegEyeSlash className="text-[16px]" />}
                  </button>
                </Field>
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
                  <>Create account <FiArrowRight className="text-[16px]" /></>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-3">
                <span className="flex-1 h-px bg-gray-150" />
                <span className="text-[11px] font-[750] text-gray-400 uppercase tracking-wider">or</span>
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
                {isGoogleLoading ? "Connecting…" : "Sign up with Google"}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-[13.5px] text-gray-500 mt-5 font-[500]">
              Already have an account?{" "}
              <Link href="/login" className="font-[750] text-[#1565C0] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Parental Consent Modal */}
      {showParentalModal && (
        <Modal
          open={showParentalModal}
          onClose={() => {
            if (!parentalLoading) setShowParentalModal(false);
          }}
          maxWidth="md"
          ariaLabel="Parental Consent Required"
        >
          <div className="p-6 sm:p-8">
            <h2 className="text-[20px] font-[800] text-gray-800 mb-2">Parental Consent Required</h2>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-6 font-[500]">
              Under DPDPA 2023, because you are under 18 years of age, we require verifiable parental or guardian consent to create your account and process your registration.
            </p>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[12.5px] font-[600]">
                {modalError}
              </div>
            )}

            {!otpSent ? (
              <div>
                <label className="block text-[11px] font-[700] text-gray-600 mb-1.5 uppercase tracking-wide">
                  Parent/Guardian Email Address
                </label>
                <div className="relative flex items-center border border-gray-200 bg-white rounded-xl focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/10 mb-5">
                  <span className="pl-3.5 flex-shrink-0">
                    <FiMail className="text-[16px] text-gray-400" />
                  </span>
                  <input
                    type="email"
                    placeholder="guardian@example.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    disabled={parentalLoading}
                    className="flex-1 h-[46px] px-3 text-[14px] bg-transparent outline-none pr-10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleInitiateParentalConsent}
                  disabled={parentalLoading}
                  className="w-full h-[46px] bg-[#1565C0] hover:bg-[#0D47A1] text-white font-[700] text-[14px] rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
                >
                  {parentalLoading ? (
                    <Spinner size={18} className="text-white" />
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3.5 mb-5 text-[12.5px] font-[500] leading-relaxed">
                  We have sent a verification code to <strong>{guardianEmail}</strong>. Please enter the code below to complete your registration.
                </div>

                <label className="block text-[11px] font-[700] text-gray-600 mb-1.5 uppercase tracking-wide">
                  Verification Code (OTP)
                </label>
                <div className="relative flex items-center border border-gray-200 bg-white rounded-xl focus-within:border-[#1565C0] focus-within:ring-2 focus-within:ring-[#1565C0]/10 mb-5">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={parentOtp}
                    onChange={(e) => setParentOtp(e.target.value)}
                    disabled={parentalLoading}
                    className="flex-1 h-[46px] px-4 text-[14px] tracking-widest text-center font-[700] bg-transparent outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    disabled={parentalLoading}
                    className="flex-1 h-[46px] border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-[700] text-[14px] rounded-xl transition-all disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyParentalConsent}
                    disabled={parentalLoading}
                    className="flex-1 h-[46px] bg-[#1565C0] hover:bg-[#0D47A1] text-white font-[700] text-[14px] rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
                  >
                    {parentalLoading ? (
                      <Spinner size={18} className="text-white" />
                    ) : (
                      "Verify & Create Account"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
};

export default Register;
