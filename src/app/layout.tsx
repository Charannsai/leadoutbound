import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/common/command-palette";
import { PageTransition } from "@/components/layout/page-transition";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OutReach AI — Personal AI Outbound Workspace",
  description:
    "An AI-powered outbound workspace for lead discovery, personalized outreach, and campaign management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased bg-body-bg text-text-primary" suppressHydrationWarning>
        <ClientProviders>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-body-bg">
              <div className="max-w-6xl mx-auto px-6 py-8 lg:px-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
          <CommandPalette />
        </ClientProviders>
      </body>
    </html>
  );
}
