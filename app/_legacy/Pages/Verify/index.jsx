import React, { useContext, useState, useEffect, useRef } from "react";
import OtpBox from "../../components/OtpBox";
import { Button, CircularProgress } from "@mui/material";
import { postData } from "../../utils/api";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MyContext } from "../../LegacyProviders";
import SEO from "../../components/SEO";

const RESEND_COOLDOWN = 60; // seconds

const Verify = () => {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef(null);

  const context = useContext(MyContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const actionType = searchParams.get("actionType");
  const isForgotPassword = actionType === "forgot-password";

  // Start countdown on mount
  useEffect(() => {
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Redirect if no email available
  if (!email) {
    return (
      <section className="py-10 section">
        <SEO title="Verify OTP" url="/verify" noIndex />
        <div className="container">
          <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card text-center">
            <p className="text-red-500 mb-4">Session expired. Please start again.</p>
            <Link href="/login" className="link text-primary font-[600]">Back to Login</Link>
          </div>
        </div>
      </section>
    );
  }

  const verifyOTP = (e) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      context.openAlertBox("error", "Please enter the 6-digit OTP");
      return;
    }
    setIsSubmitting(true);

    const endpoint = isForgotPassword
      ? "/api/user/verify-forgot-password-otp"
      : "/api/user/verifyemail";

    postData(endpoint, { email, otp }).then((res) => {
      setIsSubmitting(false);
      if (res?.error === false) {
        context.openAlertBox("success", res?.message);
        if (isForgotPassword) {
          router.push(`/forgot-password?email=${encodeURIComponent(email)}`);
        } else {
          router.push("/login");
        }
      } else {
        context.openAlertBox("error", res?.message);
      }
    });
  };

  const handleResend = () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);

    const endpoint = isForgotPassword
      ? "/api/user/forgot-password"
      : "/api/user/resend-otp";

    postData(endpoint, { email }).then((res) => {
      setIsResending(false);
      if (res?.error === false) {
        context.openAlertBox("success", "OTP resent successfully");
        startCountdown();
      } else {
        context.openAlertBox("error", res?.message || "Failed to resend OTP");
      }
    });
  };

  return (
    <section className="py-10 section">
      <SEO title="Verify OTP" url="/verify" noIndex />
      <div className="container">
        <div className="shadow-md w-full max-w-[400px] m-auto rounded-md bg-white p-5 px-6 sm:px-10 card">
          <div className="flex items-center justify-center text-center">
            <img src="/images/verify2.png" alt="verify icon" width="80" />
          </div>
          <h3 className="text-center text-[18px] text-black mt-4 mb-1">
            Verify OTP
          </h3>
          <p className="mt-0 mb-4 text-center text-[14px] text-gray-600">
            OTP sent to{" "}
            <span className="font-bold text-primary">{email}</span>
          </p>

          <form onSubmit={verifyOTP}>
            <OtpBox length={6} onChange={setOtp} />

            <div className="flex items-center justify-center px-3 mt-5">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-org btn-lg"
              >
                {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Verify OTP"}
              </Button>
            </div>
          </form>

          {/* Resend OTP */}
          <div className="flex items-center justify-center mt-4 gap-2 text-[14px]">
            <span className="text-gray-500">Didn't receive it?</span>
            {countdown > 0 ? (
              <span className="text-gray-400">
                Resend in <span className="font-semibold text-primary">{countdown}s</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={isResending}
                onClick={handleResend}
                className="link font-[600] text-primary disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend OTP"}
              </button>
            )}
          </div>

          <div className="text-center mt-3">
            <Link href="/login" className="text-[13px] text-gray-400 hover:text-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Verify;
