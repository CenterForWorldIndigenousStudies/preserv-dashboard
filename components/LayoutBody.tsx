"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@organisms/Sidebar";
import SidebarToggle from "@molecules/SidebarToggle";

interface LayoutBodyProps {
  children: ReactNode;
}

export default function LayoutBody({ children }: LayoutBodyProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar: always visible at md+ */}
      <div className="hidden md:flex md:h-full md:w-60 md:flex-col">
        <Sidebar isOpen={true} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with toggle */}
        <div className="flex h-16 items-center gap-4 border-b border-moss/10 bg-white/80 px-4 py-4 md:hidden">
          <SidebarToggle onClick={() => setSidebarOpen(true)} />
          <p className="text-sm font-semibold text-ink">Preservation Pipeline</p>
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      <div className="md:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
