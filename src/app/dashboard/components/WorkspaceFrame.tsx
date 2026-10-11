"use client";

import { useEffect, useState, type ReactNode } from "react";
import Logo from "@/components/Logo";

type WorkspaceFrameProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function WorkspaceFrame({
  sidebar,
  children,
}: WorkspaceFrameProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => {
      setIsMobile(mediaQuery.matches);

      if (!mediaQuery.matches) {
        setSidebarOpen(false);
      }
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-editor-base text-editor-primary">
      <div
        id="workspace-sidebar"
        inert={isMobile && !sidebarOpen}
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest("a")
          ) {
            setSidebarOpen(false);
          }
        }}
        className={`fixed inset-y-0 left-0 z-30 w-72 shrink-0 transition-transform duration-150 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="fixed inset-0 z-20 cursor-default bg-black/60 md:hidden"
        />
      )}

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-editor-border bg-editor-raised px-4 md:hidden">
          <Logo textClassName="text-base font-semibold tracking-tight text-editor-accent" />
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-controls="workspace-sidebar"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            className="flex h-10 w-10 items-center justify-center rounded-editor-sm text-editor-secondary transition hover:bg-editor-muted hover:text-editor-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 6 12 12M18 6 6 18"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
