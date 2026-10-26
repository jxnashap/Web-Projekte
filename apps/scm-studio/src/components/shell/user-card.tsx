import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { requireUser } from "@/lib/auth";

export async function UserCard() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-ink text-[13px] font-bold text-white">{user.initials}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{user.name}</div>
        <div className="text-[12px] text-muted">{user.role === "admin" ? "Inhaber" : "Team"}</div>
      </div>
      <form action={logout}>
        <button className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Abmelden" title="Abmelden">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
