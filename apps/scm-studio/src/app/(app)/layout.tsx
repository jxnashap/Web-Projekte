import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { CommandMenuServer } from "@/components/shell/command-menu-server";
import { DemoBanner } from "@/components/shell/demo-banner";
import { MobileNav, SidebarNav } from "@/components/shell/sidebar";
import { UserCard } from "@/components/shell/user-card";
import { Skeleton } from "@/components/ui/skeleton";

function Brand() {
  return (
    <Link href="/" className="flex items-end gap-2 px-2">
      <Image src="/logo-dark.svg" alt="SCM Creatives" width={92} height={32} priority />
      <span className="mb-[3px] font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Studio</span>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line px-4 py-5 lg:flex">
        <Brand />
        <SidebarNav />
        <div className="mt-auto">
          <Suspense fallback={<Skeleton className="h-14" />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Image src="/logo-dark.svg" alt="SCM Creatives" width={70} height={24} />
          </div>
          <Suspense fallback={<Skeleton className="h-10 w-full max-w-md rounded-full" />}>
            <CommandMenuServer />
          </Suspense>
        </header>
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-8 sm:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
