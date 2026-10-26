import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Klassen zusammenführen; spätere Tailwind-Klassen überschreiben frühere (z. B. h-9 statt h-10 am Input). */
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
