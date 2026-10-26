import { cn } from "@/lib/cn";
import { FieldError } from "./action-form";

// Apple-Formularfelder: gefüllt statt umrandet, Fokus mit weichem Ring im Akzent.
const control =
  "w-full rounded-[var(--radius-control)] border border-transparent bg-sunken px-3 text-[15px] text-ink transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[#ececf0] focus:border-accent/45 focus:bg-surface focus:shadow-[0_0_0_4px_rgb(225_37_27/0.12)] focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-accent/60";

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
      <span className="text-[13px] font-medium text-ink-2">
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
  return <div className={cn("mt-7 flex flex-wrap items-center justify-end gap-2", className)} {...p} />;
}

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11 sm:h-10", className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:10px] bg-[right_12px_center] bg-no-repeat pr-8 sm:h-10", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 16' fill='none' stroke='%236e6e73' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 6l3-3 3 3M2 10l3 3 3-3'/%3E%3C/svg%3E\")" }}
      {...p}>
      {children}
    </select>
  );
}

export function Checkbox({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex min-h-8 items-center gap-2.5 text-[15px] text-ink">
      <input type="checkbox" className="size-[18px] rounded accent-[var(--color-accent)]" {...p} />
      {label}
    </label>
  );
}
