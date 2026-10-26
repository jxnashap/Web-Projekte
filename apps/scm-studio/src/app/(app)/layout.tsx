import { Suspense } from "react";
import { Toaster } from "sonner";
import { Brand } from "@/components/shell/brand";
import { CommandMenuServer } from "@/components/shell/command-menu-server";
import { DemoBanner } from "@/components/shell/demo-banner";
import { MobileNav, QuickAddButton, SidebarNav } from "@/components/shell/sidebar";
import { UserCard } from "@/components/shell/user-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Seitenleiste wie in macOS: Glas, Icons, dezente Auswahl */}
      <aside className="material sticky top-0 hidden h-dvh flex-col gap-7 border-r border-hairline px-3 pb-4 pt-5 lg:flex">
        <Brand className="px-2.5" />
        <Suspense fallback={<div className="h-[420px]" />}>
          <SidebarNav />
        </Suspense>
        <div className="mt-auto">
          <Suspense fallback={<Skeleton className="h-14" />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="material sticky top-0 z-30 flex items-center gap-3 border-b border-hairline px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] sm:px-8">
          <div className="lg:hidden">
            <Brand size={28} className="[&>span]:hidden min-[420px]:[&>span]:inline" />
          </div>
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md rounded-[10px]" />}>
            <CommandMenuServer />
          </Suspense>
          <div className="ml-auto">
            <QuickAddButton />
          </div>
        </header>
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <main className="mx-auto w-full max-w-[1360px] px-4 pb-32 pt-8 sm:px-8 lg:pb-14 lg:pt-10">{children}</main>
      </div>
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
      <Toaster
        position="top-center"
        offset={16}
        toastOptions={{
          className: "!rounded-[16px] !border-0 !shadow-[var(--shadow-pop)] !font-[inherit] !text-[14px]",
        }}
      />
    </div>
  );
}
