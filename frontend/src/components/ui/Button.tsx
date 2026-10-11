import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--avenoryn-accent)] text-white hover:bg-[var(--avenoryn-accent-hover)] shadow-sm",
  secondary:
    "bg-[var(--avenoryn-surface)] text-[var(--avenoryn-ink)] border border-[var(--avenoryn-border)] hover:bg-[var(--avenoryn-accent-soft)]",
  ghost:
    "bg-transparent text-[var(--avenoryn-ink-soft)] hover:bg-[var(--avenoryn-accent-soft)] hover:text-[var(--avenoryn-ink)]",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--avenoryn-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
