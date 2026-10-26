import { cn } from "@/lib/cn";
import { FieldError } from "./action-form";

const control =
  "w-full rounded-lg border border-line-2 bg-surface px-3 text-[14px] text-ink placeholder:text-faint transition-colors hover:border-faint focus:border-ink focus:outline-none";

/** Beschriftetes Feld. Mit `name` erscheinen Feldfehler aus einem umgebenden ActionForm automatisch. */
export function Field({
  label,
  hint,
  error,
  name,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  name?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-ink-2">
        {label}
        {optional && <span className="ml-1 font-normal text-faint">optional</span>}
      </span>
      {children}
      {hint && !error && <span className="text-[12px] text-muted">{hint}</span>}
      {error && <span className="text-[12px] font-medium text-accent-ink">{error}</span>}
      {name && <FieldError name={name} />}
    </label>
  );
}

/** Raster für Formulare: auf dem Handy einspaltig, ab sm zweispaltig. */
export function FormGrid({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...p} />;
}

/** Fußzeile eines Formulars mit Knöpfen rechts. */
export function FormActions({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-2", className)} {...p} />;
}

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-10", className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%236b6b72' stroke-width='1.6'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E\")" }}
      {...p}>
      {children}
    </select>
  );
}

export function Checkbox({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-2">
      <input type="checkbox" className="size-4 accent-[var(--color-accent)]" {...p} />
      {label}
    </label>
  );
}
