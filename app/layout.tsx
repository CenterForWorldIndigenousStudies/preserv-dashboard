import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";
import Providers from "@/components/Providers";
import AuthStatus from "@/components/AuthStatus";

export const metadata: Metadata = {
  title: "CWIS Preservation Pipeline Dashboard",
  description: "Operational dashboard for CWIS preservation pipeline documents, reviews, and failures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="en">
      <body className="font-['Avenir_Next','Trebuchet_MS',sans-serif] antialiased">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 md:px-6 lg:px-8">
            <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-moss/10 bg-white/80 px-6 py-5 shadow-panel backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-moss/70">Center For World Indigenous Studies</p>
                <p className="mt-2 text-2xl font-semibold text-ink">Preservation Pipeline Dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                <nav className="flex flex-wrap gap-3 text-sm">
                  <a href="/" className="rounded-full bg-sand px-4 py-2 text-ink hover:bg-sky">
                    Overview
                  </a>
                  <a href="/reviews" className="rounded-full bg-sand px-4 py-2 text-ink hover:bg-sky">
                    Review Queue
                  </a>
                  <a href="/failures" className="rounded-full bg-sand px-4 py-2 text-ink hover:bg-sky">
                    Failures
                  </a>
                </nav>
                <AuthStatus />
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}