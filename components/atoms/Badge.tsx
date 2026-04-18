import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "clay" | "sky" | "moss" | "sand";
  children: ReactNode;
  className?: string;
}

/**
 * Atom: State badge pill used in DocumentTable and review status displays.
 * Represents the pill-style element: rounded-full bg-sky px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-ink
 */
export function Badge({ variant = "sky", children, className = "" }: BadgeProps): ReactNode {
  const bgColor =
    variant === "clay"
      ? "bg-clay/15 text-clay"
      : variant === "moss"
        ? "bg-moss/10 text-moss"
        : variant === "sand"
          ? "bg-sand text-ink"
          : "bg-sky text-ink";

  return (
    <span
      className={`inline-block rounded-full ${bgColor} px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] ${className}`}
    >
      {children}
    </span>
  );
}