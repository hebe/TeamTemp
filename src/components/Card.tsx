import { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
};

export default function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={`
        bg-surface rounded-[var(--radius)] border-2 border-border
        ${elevated ? "shadow-card" : "shadow-card-sm"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
