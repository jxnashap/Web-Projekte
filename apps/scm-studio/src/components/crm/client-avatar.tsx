// Profilbild eines Kunden: Logo, sonst Initialen auf der Kundenfarbe.
import { cn } from "@/lib/cn";
import { logoSrc } from "@/lib/crm/logo-shared";

export const initials = (name: string) =>
  name
    .replace(/[„“"'&]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function ClientAvatar({
  client,
  size = 32,
  className,
}: {
  client: { id: number; name: string; color: string; logoPath?: string | null };
  size?: number;
  className?: string;
}) {
  const src = logoSrc(client.id, client.logoPath);
  const style = { width: size, height: size, borderRadius: size * 0.24 };
  if (src)
    return (
      // privates Bild über die eigene Route, deshalb ohne next/image-Optimierung
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} loading="lazy" style={style} className={cn("shrink-0 bg-white object-contain ring-1 ring-line", className)} />
    );
  return (
    <span
      aria-hidden
      style={{ ...style, background: client.color, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      className={cn("grid shrink-0 place-items-center font-semibold tracking-[-0.02em] text-white", className)}
    >
      {initials(client.name)}
    </span>
  );
}
