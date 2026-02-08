import { ReactNode } from "react";

type BadgeVariant = "brand" | "warm" | "cool" | "up" | "alert" | "muted";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  brand: "bg-brand-light text-brand",
  warm:  "bg-warm-light text-warm",
  cool:  "bg-cool-light text-cool",
  up:    "bg-up-light text-up",
  alert: "bg-alert-light text-alert",
  muted: "bg-surface-2 text-muted",
};

export default function Badge({ children, variant = "brand", dot = false, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        text-[0.75rem] font-semibold tracking-wide uppercase
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
