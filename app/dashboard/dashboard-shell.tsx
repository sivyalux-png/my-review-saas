"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/dashboard/requests", label: "Requests", icon: "↗" },
  { href: "/dashboard/plan", label: "Plan & credits", icon: "◇" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activePage = navigation.find(({ href }) => isActivePath(pathname, href));

  return (
    <div className="dashboard-shell min-h-screen bg-[#09090b] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-zinc-800 bg-[#0d0d10] px-4 py-5 lg:flex">
        <Link aria-label="TableSignal home" className="mb-9 flex items-center gap-3 px-2" href="/">
          <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
          <span className="text-[16px] font-semibold tracking-[-0.04em]">table<span className="text-emerald-400">signal</span></span>
        </Link>
        <p className="px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Workspace</p>
        <div className="mt-3 flex items-center gap-2.5 rounded-[5px] border border-zinc-800 bg-zinc-900/70 px-3 py-3">
          <span className="flex size-8 items-center justify-center rounded-[4px] bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">N</span>
          <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-zinc-200">Northstar Health</span><span className="mt-0.5 block text-[9px] text-zinc-500">3 locations</span></span>
        </div>
        <nav aria-label="Dashboard navigation" className="mt-8 space-y-1 text-[12px]">
          {navigation.map(({ href, icon, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[4px] border-l-2 px-3 py-2.5 transition-colors ${
                  active
                    ? "border-emerald-400 bg-emerald-400/[0.08] font-medium text-emerald-200"
                    : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
                href={href}
                key={href}
              >
                <span aria-hidden="true" className={`w-4 text-center ${active ? "text-emerald-300" : ""}`}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-zinc-800 pt-4">
          <p className="px-2 text-[10px] leading-5 text-zinc-500">Need help setting things up?</p>
          <a className="mt-1 inline-block px-2 text-[11px] font-medium text-emerald-300 hover:text-emerald-200" href="mailto:hello@tablesignal.com">Contact support</a>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-56">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-[#09090b]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
          <Link aria-label="TableSignal home" className="flex items-center gap-2.5 lg:hidden" href="/">
            <span aria-hidden="true" className="brand-mark brand-mark-small"><span /><span /><span /></span>
            <span className="text-[14px] font-semibold tracking-[-0.04em]">table<span className="text-emerald-400">signal</span></span>
          </Link>
          <div className="hidden text-[11px] text-zinc-500 lg:block">Northstar Health <span className="mx-1 text-zinc-700">/</span> {activePage?.label ?? "Workspace"}</div>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <span className="hidden text-[10px] text-zinc-500 sm:inline">Northstar Health · 3 locations</span>
            <button aria-label="Account: Maya Lewis" className="flex size-8 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-[10px] font-semibold text-emerald-300" type="button">ML</button>
          </div>
        </header>

        <nav aria-label="Dashboard navigation" className="flex gap-5 overflow-x-auto border-b border-zinc-800 px-5 py-3 text-[11px] lg:hidden">
          {navigation.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap transition-colors ${active ? "font-medium text-emerald-300" : "text-zinc-400 hover:text-white"}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="min-h-[calc(100vh-57px)]">{children}</main>
      </div>
    </div>
  );
}
