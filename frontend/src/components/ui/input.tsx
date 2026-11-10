import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-lg border border-border bg-surface text-sm text-fg placeholder:text-fg-3 shadow-card " +
  "transition-[border-color,box-shadow] duration-150 ease-out " +
  "hover:border-border-strong focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(fieldBase, "h-9 px-3", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-20 px-3 py-2", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "h-9 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238a8982' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='m7 10 5 5 5-5'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pl-3 pr-8",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[13px] font-medium text-fg-2">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-fg-3">{hint}</span>
      ) : null}
    </label>
  );
}
