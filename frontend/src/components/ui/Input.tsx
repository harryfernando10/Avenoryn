import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({
  id,
  label,
  hint,
  className = "",
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--avenoryn-ink-soft)]">
        {label}
      </span>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-[var(--avenoryn-border)] bg-[var(--avenoryn-surface)] px-3.5 py-2.5 text-[var(--avenoryn-ink)] outline-none transition placeholder:text-[var(--avenoryn-muted)] focus:border-[var(--avenoryn-accent)] focus:ring-2 focus:ring-[var(--avenoryn-accent-soft)] ${className}`}
        {...rest}
      />
      {hint ? (
        <span className="mt-1.5 block text-xs text-[var(--avenoryn-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
