"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { PageTransition } from "./page-transition";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInbox = pathname === "/inbox";

  if (isInbox) {
    return (
      <main className="w-screen h-screen overflow-hidden bg-body-bg">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-body-bg">
      <main className="w-full h-full overflow-y-auto px-6 pt-8 pb-32">
        <div className="max-w-5xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <Sidebar />
    </div>
  );
}
