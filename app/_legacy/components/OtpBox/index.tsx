"use client";

import { useState, type KeyboardEvent } from 'react';

interface OtpBoxProps {
  length: number;
  onChange: (otp: string) => void;
}

const OtpBox = ({ length, onChange }: OtpBoxProps) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));

    const handleChange = (element: HTMLInputElement, index: number) => {
        const value = element.value;
        if (isNaN(Number(value)))
            return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        onChange(newOtp.join(""));

        if (value && index < length - 1) {
            document.getElementById(`otp-input-${index + 1}`)?.focus();
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (event.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-input-${index - 1}`)?.focus();
        }
    };

  return (
    <div className='flex otpBox gap-[5px] justify-center'>
        {otp.map((_, index) => (
            <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                pattern="[0-9]*"
                maxLength={1}
                aria-label={`OTP digit ${index + 1}`}
                value={otp[index]}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className='w-[45px] h-[45px] text-center text-[17px]'
                />
        ))}
    </div>
  );
};

export default OtpBox;
