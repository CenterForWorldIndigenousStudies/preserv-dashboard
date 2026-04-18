import type { ReactElement, ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

function buttonClasses(variant: ButtonBaseProps["variant"], className: string): string {
  const base = "rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-moss/50";
  switch (variant) {
    case "secondary":
      return `${base} bg-sand text-ink hover:bg-sky ${className}`;
    case "ghost":
      return `${base} bg-transparent text-ink/70 hover:bg-sand hover:text-ink ${className}`;
    default:
      return `${base} bg-moss text-white hover:bg-moss/80 ${className}`;
  }
}

export function ButtonPrimary({ children, className = "", ...props }: ButtonBaseProps): ReactElement {
  return (
    <button {...props} className={buttonClasses("primary", className)}>
      {children}
    </button>
  );
}

export function ButtonSecondary({ children, className = "", ...props }: ButtonBaseProps): ReactElement {
  return (
    <button {...props} className={buttonClasses("secondary", className)}>
      {children}
    </button>
  );
}

export function ButtonGhost({ children, className = "", ...props }: ButtonBaseProps): ReactElement {
  return (
    <button {...props} className={buttonClasses("ghost", className)}>
      {children}
    </button>
  );
}