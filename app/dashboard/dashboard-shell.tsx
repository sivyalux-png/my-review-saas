"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logOut } from "./actions";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/dashboard/requests", label: "Requests", icon: "↗" },
  { href: "/dashboard/plan", label: "Plan & credits", icon: "◇" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export default function DashboardShell({
  children,
  businessName,
  fullName,
  planTier,
  creditsRemaining,
  smsCreditsRemaining,
}: {
  children: ReactNode;
  businessName: string;
  fullName: string | null;
  planTier: string | null;
  creditsRemaining: number | null;
  smsCreditsRemaining: number;
}) {
  const pathname = usePathname();
  const activePage = navigation.find(({ href }) => isActivePath(pathname, href));
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuButtonRef = useRef<HTMLButtonElement>(null);
  const accountName = fullName?.trim() || businessName;
  const accountInitials = fullName?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase() || businessName.trim()[0]?.toUpperCase() || "B";

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        accountMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <div className="dashboard-shell min-h-screen bg-[#09090b] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-zinc-800 bg-[#0d0d10] px-4 py-5 lg:flex">
        <Link aria-label="TableSignal home" className="mb-9 flex items-center gap-3 px-2" href="/">
          <span aria-hidden="true" className="brand-mark"><span /><span /><span /></span>
          <span className="text-[16px] font-semibold tracking-[-0.04em]">table<span className="text-emerald-400">signal</span></span>
        </Link>
        <p className="px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Workspace</p>
        <div className="mt-3 flex items-center gap-2.5 rounded-[5px] border border-zinc-800 bg-zinc-900/70 px-3 py-3">
          <span className="flex size-8 items-center justify-center rounded-[4px] bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">{businessName.trim()[0]?.toUpperCase() || "B"}</span>
          <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-zinc-200">{businessName}</span><span className="mt-0.5 block text-[9px] text-zinc-500">Workspace</span></span>
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
          <div className="hidden text-[11px] text-zinc-500 lg:block">{businessName} <span className="mx-1 text-zinc-700">/</span> {activePage?.label ?? "Workspace"}</div>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <Link
              aria-label={`Plan & credits: ${planTier
                ? `${planTier} · ${(creditsRemaining ?? 0).toLocaleString()} email${smsCreditsRemaining > 0 ? ` · ${smsCreditsRemaining.toLocaleString()} SMS` : ""}`
                : "No active plan"}`}
              className="hidden rounded-full border border-violet-300/50 bg-white/55 px-3 py-1.5 text-[10px] font-medium text-violet-800 transition-colors hover:border-violet-300 hover:bg-white/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 sm:inline"
              href="/dashboard/plan"
            >
              {planTier
                ? `${planTier} · ${(creditsRemaining ?? 0).toLocaleString()} email${smsCreditsRemaining > 0 ? ` · ${smsCreditsRemaining.toLocaleString()} SMS` : ""}`
                : "No active plan"}
            </Link>
            <span className="hidden max-w-48 truncate text-[10px] text-zinc-500 sm:inline">{businessName}</span>
            <div className="relative shrink-0" ref={accountMenuRef}>
              <button
                aria-controls="account-menu"
                aria-expanded={isAccountMenuOpen}
                aria-label={`Account menu for ${accountName}`}
                className="flex size-8 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-[10px] font-semibold text-emerald-300 transition-colors hover:border-emerald-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                ref={accountMenuButtonRef}
                type="button"
              >
                {accountInitials}
              </button>
              {isAccountMenuOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 shadow-2xl"
                  id="account-menu"
                >
                  <div className="border-b border-zinc-800 px-3 py-3.5">
                    <p className="truncate text-xs font-semibold text-zinc-100">{accountName}</p>
                    <p className="mt-1.5 truncate text-[11px] text-zinc-400">{businessName}</p>
                  </div>
                  <div className="space-y-1 pt-2">
                    <Link className="block rounded-md px-3 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300" href="/dashboard/settings" onClick={() => setIsAccountMenuOpen(false)}>Settings</Link>
                    <Link className="block rounded-md px-3 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-300" href="/dashboard/plan" onClick={() => setIsAccountMenuOpen(false)}>Plan &amp; credits</Link>
                  </div>
                  <form action={logOut} className="mt-2 border-t border-zinc-800 pt-2">
                    <button className="block w-full rounded-md px-3 py-2.5 text-left text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-rose-300" type="submit">Logout</button>
                  </form>
                </div>
              )}
            </div>
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
