import { ReactNode } from "react";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export default function SectionHeading({ title, subtitle, children }: SectionHeadingProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg">{title}</h2>
        {children}
      </div>
      {subtitle && (
        <p className="text-[0.875rem] text-muted mt-1 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
