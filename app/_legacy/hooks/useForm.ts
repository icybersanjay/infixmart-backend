"use client";

import { useState, type ChangeEvent, type FocusEvent } from 'react';

type Validator = (value: unknown) => string;
type Rules = Record<string, Validator[]>;

// ── Validator factories ────────────────────────────────────────────────────────

export const required = (msg: string = 'This field is required'): Validator =>
  (value) => (!value || !String(value).trim() ? msg : '');

export const emailFormat = (msg: string = 'Enter a valid email address'): Validator =>
  (value) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) ? msg : '');

export const minLength = (min: number, msg?: string): Validator =>
  (value) =>
    String(value || '').trim().length < min
      ? msg || `Must be at least ${min} characters`
      : '';

export const exactDigits = (digits: number, msg?: string): Validator =>
  (value) =>
    !/^\d+$/.test(String(value || '')) || String(value || '').length !== digits
      ? msg || `Must be exactly ${digits} digits`
      : '';

export const greaterThan = (min: number, msg?: string): Validator =>
  (value) => (Number(value) <= min ? msg || `Must be greater than ${min}` : '');

export const minVal = (min: number, msg?: string): Validator =>
  (value) => (Number(value) < min ? msg || `Must be at least ${min}` : '');

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useForm — lightweight form state + validation hook.
 */
export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  rules: Rules = {}
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateField = (name: string, value: unknown): string => {
    const fieldRules = rules[name] || [];
    for (const rule of fieldRules) {
      const msg = rule(value);
      if (msg) return msg;
    }
    return '';
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const newValue = type === 'checkbox' ? target.checked : value;
    setValues((prev) => ({ ...prev, [name]: newValue }));
    if (submitted || touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, newValue) }));
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  /** Run all validators. Returns true if form is valid. */
  const validate = (): boolean => {
    setSubmitted(true);
    const newErrors: Record<string, string> = {};
    Object.keys(rules).forEach((name) => {
      const err = validateField(name, values[name] ?? '');
      if (err) newErrors[name] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitted(false);
  };

  /** True only after a submit attempt AND there are errors. */
  const hasErrors = submitted && Object.values(errors).some(Boolean);

  return {
    values,
    errors,
    touched,
    submitted,
    handleChange,
    handleBlur,
    validate,
    reset,
    setValues,
    hasErrors,
  };
}
