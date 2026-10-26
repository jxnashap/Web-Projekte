// Gemeinsame Form für Server Actions: Formular → zod → Ergebnis mit Feldfehlern (deutsch).
import { z } from "zod";

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** optional: Ziel nach Erfolg (Client leitet weiter) */
  redirectTo?: string;
  /** optional: frische ID z. B. nach dem Anlegen */
  id?: number;
};

export const idle: ActionState = {};

/** FormData → Objekt (leere Strings werden zu undefined, Mehrfachfelder zu Arrays bei name[]) */
export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const value = typeof v === "string" ? (v.trim() === "" ? undefined : v.trim()) : v;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      (out[key] as unknown[] | undefined)?.push(value) ?? (out[key] = [value]);
    } else out[k] = value;
  }
  return out;
}

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData):
  | { success: true; data: z.infer<S> }
  | { success: false; state: ActionState } {
  const r = schema.safeParse(formToObject(fd));
  if (r.success) return { success: true, data: r.data };
  const flat = z.flattenError(r.error);
  return {
    success: false,
    state: { ok: false, error: flat.formErrors[0] ?? "Bitte die markierten Felder prüfen.", fieldErrors: flat.fieldErrors as Record<string, string[]> },
  };
}

export const fail = (error: string, fieldErrors?: ActionState["fieldErrors"]): ActionState => ({ ok: false, error, fieldErrors });
export const done = (message: string, extra?: Partial<ActionState>): ActionState => ({ ok: true, message, ...extra });

/** zod-Bausteine mit deutschen Meldungen */
export const zText = (label: string, max = 500) => z.string({ error: `${label} fehlt` }).min(1, `${label} fehlt`).max(max, `${label} ist zu lang`);
export const zOptText = (max = 2000) => z.string().max(max).optional();
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format TT.MM.JJJJ wählen");
export const zOptDate = zDate.optional();
export const zInt = (label: string) => z.coerce.number({ error: `${label}: Zahl erwarten` }).int(`${label}: ganze Zahl`);
export const zOptInt = z.coerce.number().int().optional();
export const zBool = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
