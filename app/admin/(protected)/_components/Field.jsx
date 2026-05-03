"use client";

import { errorCls, helpCls, labelCls } from "../_lib/formStyles";

/**
 * Form field wrapper with consistent label / help / error styling.
 *
 *   <Field label="Email" required error={errors.email} help="Used for invoices">
 *     <input className={inputCls} ... />
 *   </Field>
 */
export default function Field({
  label,
  htmlFor,
  required = false,
  error,
  help,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
          {required && <span className="text-[#E53935] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className={errorCls} role="alert">{error}</p>
        : help && <p className={helpCls}>{help}</p>}
    </div>
  );
}
