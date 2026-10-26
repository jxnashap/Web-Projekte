"use client";
// Formularfelder im Apple-Stil: gefüllt statt umrandet, Fokus mit Ring im Akzent.
// Field reicht Fehlerzustand und Beschreibung per Context an Input/Select/Textarea weiter
// (aria-invalid, aria-describedby), damit Screenreader und Optik denselben Fehler zeigen.
import { createContext, useContext, useEffect, useId } from "react";
import { cn } from "@/lib/cn";
import { useFormCtx } from "./action-form";
import { useDialog } from "./dialog";

const control =
  "w-full rounded-[var(--radius-control)] border border-transparent bg-sunken px-3 text-[16px] text-ink transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[#ececf0] focus:border-accent focus:bg-surface focus:shadow-[0_0_0_4px_rgb(225_37_27/0.14)] focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-accent aria-[invalid=true]:bg-accent-soft/40 sm:text-[15px]";

type FieldCtx = { invalid: boolean; describedBy?: string };
const Ctx = createContext<FieldCtx | null>(null);

type AriaInvalid = boolean | "true" | "false" | "grammar" | "spelling" | undefined;
function useControlProps(p: { "aria-invalid"?: AriaInvalid; "aria-describedby"?: string }) {
  const f = useContext(Ctx);
  return {
    "aria-invalid": p["aria-invalid"] ?? (f?.invalid ? true : undefined),
    "aria-describedby": p["aria-describedby"] ?? f?.describedBy,
  };
}

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
  const id = useId();
  const { state } = useFormCtx();
  const formError = name ? state.fieldErrors?.[name]?.[0] : undefined;
  const message = error ?? formError;
  const hintId = hint && !message ? `${id}-hinweis` : undefined;
  const errorId = message ? `${id}-fehler` : undefined;
  return (
    <Ctx.Provider value={{ invalid: Boolean(message), describedBy: errorId ?? hintId }}>
      <label className={cn("grid content-start gap-1.5", className)}>
        <span className="text-[13px] font-medium text-ink-2">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">optional</span>}
        </span>
        {children}
        {hintId && (
          <span id={hintId} className="text-[12px] text-muted">
            {hint}
          </span>
        )}
        {errorId && (
          <span id={errorId} className="text-[13px] font-medium text-accent-ink">
            {message}
          </span>
        )}
      </label>
    </Ctx.Provider>
  );
}

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  const aria = useControlProps(p);
  return <input className={cn(control, "h-11 sm:h-10", className)} {...p} {...aria} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const aria = useControlProps(p);
  return <textarea className={cn(control, "min-h-24 py-2 leading-relaxed", className)} {...p} {...aria} />;
}

// Pfeil als Hintergrundbild; Position und Größe im style, sonst hält tailwind-merge sie für eine Hintergrundfarbe
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 16' fill='none' stroke='%236e6e73' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 6l3-3 3 3M2 10l3 3 3-3'/%3E%3C/svg%3E\")";

export function Select({ className, children, style, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const aria = useControlProps(p);
  return (
    <select
      className={cn(control, "h-11 appearance-none pr-8 sm:h-10", className)}
      style={{ backgroundImage: chevron, backgroundPosition: "right 12px center", backgroundSize: "10px", backgroundRepeat: "no-repeat", ...style }}
      {...p}
      {...aria}
    >
      {children}
    </select>
  );
}

export function Checkbox({ label, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("inline-flex min-h-11 items-center gap-2.5 text-[15px] text-ink sm:min-h-8", className)}>
      <input type="checkbox" className="size-[18px] shrink-0 rounded accent-[var(--color-accent)]" {...p} />
      {label}
    </label>
  );
}

/** Raster für Formulare: auf dem Handy einspaltig, ab sm zweispaltig. */
export function FormGrid({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)} {...p} />;
}

/**
 * Fußzeile eines Formulars mit Knöpfen rechts. Zeigt den Fehler des letzten Absendens als Hinweis (role=alert),
 * im Dialog klebt sie am unteren Rand (auf dem Handy über der Bildschirmkante).
 */
export function FormActions({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  const { state, registerActions } = useFormCtx();
  const inDialog = Boolean(useDialog());
  useEffect(() => registerActions?.(), [registerActions]);
  // justify-*-Klassen gelten für die Knopfreihe, alles andere für den Rahmen
  const classes = (className ?? "").split(/\s+/).filter(Boolean);
  const justify = classes.filter((c) => c.startsWith("justify-")).join(" ");
  const outer = classes.filter((c) => !c.startsWith("justify-")).join(" ");
  return (
    <div
      className={cn(
        "mt-7",
        inDialog && "sticky bottom-0 -mx-6 -mb-6 border-t border-hairline bg-surface/97 px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl",
        outer,
      )}
      {...p}
    >
      {state.ok === false && state.error && (
        <p role="alert" className="mb-3 rounded-[10px] bg-accent-soft px-3 py-2 text-[14px] font-medium text-accent-ink">
          {state.error}
        </p>
      )}
      <div className={cn("flex flex-wrap items-center justify-end gap-2", justify)}>{children}</div>
    </div>
  );
}
