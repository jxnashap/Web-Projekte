import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";

/** Avatar wie in iOS-Kontakten: Initialen auf grauem Verlauf */
export function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#a8a8ad] to-[#86868b] font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export async function UserCard() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] px-2 py-2">
      <Avatar initials={user.initials} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{user.name}</div>
        <div className="text-[12px] text-muted">{user.role === "admin" ? "Inhaber" : "Team"}</div>
      </div>
      <form action={logout}>
        <button className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fill hover:text-ink" aria-label="Abmelden" title="Abmelden">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
