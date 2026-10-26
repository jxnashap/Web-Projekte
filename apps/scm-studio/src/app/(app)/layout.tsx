import { Suspense } from "react";
import { Toaster } from "sonner";
import { Brand } from "@/components/shell/brand";
import { CommandMenuServer } from "@/components/shell/command-menu-server";
import { DemoBanner } from "@/components/shell/demo-banner";
import { MobileNav, QuickAddButton, SidebarNav } from "@/components/shell/sidebar";
import { UserCard } from "@/components/shell/user-card";
import { ConfirmProvider } from "@/components/ui/confirm";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
    <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-pop)]">
      Zum Inhalt springen
    </a>
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
        <main id="inhalt" tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-4 pb-[calc(var(--tabbar-h,calc(54px+env(safe-area-inset-bottom)))+56px)] pt-7 outline-none sm:px-8 lg:pb-14 lg:pt-10">
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
      <Toaster
        position="top-center"
        offset={16}
        containerAriaLabel="Mitteilungen"
        toastOptions={{
          className: "!rounded-[16px] !border-0 !shadow-[var(--shadow-pop)] !font-[inherit] !text-[14px]",
        }}
      />
    </div>
    </ConfirmProvider>
  );
}
