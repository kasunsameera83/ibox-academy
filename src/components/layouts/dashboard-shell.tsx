"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { HelpCircle, LogOut, Menu, X } from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/(auth)/actions";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { cn } from "@/lib/utils";
import { navIcons } from "./nav-icons";

type ShellUser = { id: string; name: string; email: string; roleLabel: string; notifications: boolean };

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, rootHref, onNavigate }: { items: NavItem[]; rootHref: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = navIcons[item.icon];
        const active = isActive(pathname, item.href, rootHref);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-canvas hover:text-ink",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBlock({ user }: { user: ShellUser }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand" aria-hidden="true">
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
        <p className="truncate text-xs text-ink-muted">{user.roleLabel}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex size-9 items-center justify-center rounded-control text-ink-muted hover:bg-canvas hover:text-ink"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export function DashboardShell({
  workspaceLabel,
  rootHref,
  nav,
  bottomNav,
  user,
  children,
}: {
  workspaceLabel: string;
  rootHref: string;
  nav: NavItem[];
  bottomNav?: NavItem[];
  user: ShellUser;
  children: ReactNode;
}) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const closeDrawer = () => drawerRef.current?.close();

  // Close the mobile drawer after navigation.
  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-float">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-[68px] items-center px-5">
          <Logo href={rootHref} />
        </div>
        <p className="px-6 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{workspaceLabel}</p>
        <nav aria-label={`${workspaceLabel} navigation`} className="flex-1 overflow-y-auto px-3 pb-4">
          <NavList items={nav} rootHref={rootHref} />
        </nav>
        <UserBlock user={user} />
      </aside>

      {/* Mobile / tablet drawer */}
      <dialog
        ref={drawerRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[min(300px,85vw)] max-w-none bg-surface p-0 shadow-float lg:hidden"
        onClick={(e) => {
          if (e.target === drawerRef.current) closeDrawer();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo href={rootHref} />
            <button type="button" onClick={closeDrawer} className="flex size-10 items-center justify-center rounded-control hover:bg-canvas" aria-label="Close menu">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label={`${workspaceLabel} navigation`} className="flex-1 overflow-y-auto px-3 pb-4">
            <NavList items={nav} rootHref={rootHref} onNavigate={closeDrawer} />
          </nav>
          <UserBlock user={user} />
        </div>
      </dialog>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 lg:h-[68px] lg:px-8">
          <button
            type="button"
            onClick={() => drawerRef.current?.showModal()}
            className="flex size-10 items-center justify-center rounded-control hover:bg-canvas lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="lg:hidden">
            <Logo href={rootHref} showName={false} />
          </div>
          <div className="flex-1" />
          {user.notifications && <NotificationBell userId={user.id} />}
          <Link href="/help" className="flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink">
            <HelpCircle className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Help</span>
          </Link>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{user.name}</p>
            <p className="text-xs leading-tight text-ink-muted">{user.email}</p>
          </div>
        </header>

        <main id="main" className={cn("mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", bottomNav && "pb-24 lg:pb-8")}>
          {children}
        </main>
      </div>

      {bottomNav && (
        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-4">
            {bottomNav.map((item) => {
              const Icon = navIcons[item.icon];
              const active = isActive(pathname, item.href, rootHref);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-brand" : "text-ink-muted")}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
