"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "brand" | "dark" | "outline" | "ghost" | "alert";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

const variantStyles: Record<Variant, string> = {
  brand:   "bg-brand text-white hover:brightness-110",
  dark:    "bg-ink text-[var(--bg)] hover:opacity-90",
  outline: "bg-transparent border-2 border-border text-ink hover:bg-surface-2",
  ghost:   "bg-transparent text-muted hover:text-ink hover:bg-surface-2",
  alert:   "bg-alert-light text-alert hover:bg-alert/15",
};

const sizeStyles: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-[0.8125rem] rounded-[var(--radius-sm)]",
  md: "px-5 py-2.5 text-[0.9375rem] rounded-[var(--radius-sm)]",
  lg: "px-6 py-3.5 text-base rounded-[var(--radius)]",
};

export default function Button({
  children,
  variant = "brand",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold cursor-pointer
        transition-all duration-150 ease-out
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
