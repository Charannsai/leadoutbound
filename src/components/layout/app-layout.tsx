"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { PageTransition } from "./page-transition";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInbox = pathname === "/inbox";

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-body-bg">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto bg-body-bg relative">
        <div className={cn("w-full min-h-full", isInbox ? "h-full" : "px-8 py-6")}>
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
