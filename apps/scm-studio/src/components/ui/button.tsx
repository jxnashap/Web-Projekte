import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap select-none transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-[0_1px_2px_rgb(225_37_27/0.3)] hover:bg-[#cc1f15]",
  secondary: "bg-fill text-ink hover:bg-[rgb(120_120_128/0.18)]",
  ghost: "text-accent-ink hover:bg-fill-2",
  danger: "bg-accent-soft text-accent-ink hover:bg-[#ffdedb]",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3.5 text-[13px]", md: "h-[38px] px-4 text-[14px]" };

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
