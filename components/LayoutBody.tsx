"use client";

import { useState, useEffect, type ReactNode } from "react";
import Sidebar from "@organisms/Sidebar";
import SidebarToggle from "@molecules/SidebarToggle";
import { PanelLeftClose, PanelLeft } from "lucide-react";

interface LayoutBodyProps {
  children: ReactNode;
}

export default function LayoutBody({ children }: LayoutBodyProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapse preference in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar: fixed, always present */}
      <div
        className={`hidden h-full flex-col md:flex ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-60 flex-shrink-0"} transition-[width] duration-300 ease-in-out`}
      >
        <Sidebar variant="desktop" />
      </div>

      {/* Desktop collapse toggle: always rendered, positioned at the content edge */}
      <div className="hidden md:block">
        <button
          type="button"
          onClick={toggleCollapse}
          className={`sticky top-20 z-50 ml-0 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-moss text-white shadow-sm hover:bg-moss/80 transition-all duration-300 ${sidebarCollapsed ? "-ml-6" : "ml-0"}`}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeft size={14} />
          ) : (
            <PanelLeftClose size={14} />
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      <div className="md:hidden">
        <Sidebar
          variant="mobile"
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with toggle */}
        <div className="flex h-16 items-center gap-4 border-b border-moss/10 bg-white/80 px-4 py-4 md:hidden">
          <SidebarToggle onClick={() => setMobileOpen(true)} />
          <p className="text-sm font-semibold text-ink">Preservation Pipeline</p>
        </div>

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
