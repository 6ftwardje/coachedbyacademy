"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/modules", label: "Modules" },
  { href: "/account", label: "Account" },
];

export function AppShell({
  children,
  studentName,
}: {
  children: React.ReactNode;
  studentName: string | null;
}) {
  const pathname = usePathname();

  const initials = studentName
    ? studentName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        <aside className="hidden md:flex md:w-56 md:shrink-0 border-r border-stone-200/70">
          <div className="flex h-full flex-col p-5">
            <div className="mb-7">
              <Link href="/dashboard" className="group inline-flex items-center">
                <span className="flex flex-col leading-none">
                  <span className="text-[0.72rem] font-semibold tracking-[0.18em] uppercase text-stone-900 dark:text-stone-50">
                    COACHEDBY
                  </span>
                  <span className="text-[0.95rem] font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                    Academy
                  </span>
                </span>
              </Link>

              {studentName && (
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full border border-stone-200 bg-white/60 dark:bg-white/10 flex items-center justify-center text-sm font-semibold text-stone-900 dark:text-stone-50">
                    {initials || studentName[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-stone-600 dark:text-stone-200 truncate">
                    {studentName}
                  </span>
                </div>
              )}
            </div>

            <nav className="space-y-3" aria-label="Main">
              {nav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "relative block rounded-lg px-2.5 py-2 text-sm font-semibold tracking-tight transition-colors",
                      "border-l-2 border-transparent",
                      isActive
                        ? [
                            "text-stone-900 dark:text-stone-50 border-stone-900 dark:border-stone-50",
                            "bg-stone-50/70 dark:bg-white/5",
                            "hover:text-stone-900 dark:hover:text-stone-50",
                          ].join(" ")
                        : [
                            "text-stone-600 dark:text-stone-200",
                            "hover:bg-stone-50 dark:hover:bg-white/5",
                            "hover:text-stone-900 dark:hover:text-stone-50",
                          ].join(" "),
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1" />

            <form action="/auth/signout" method="post">
              <button type="submit" className="cb-btn cb-btn-secondary w-full">
                Sign out <span aria-hidden>→</span>
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="md:hidden border-b border-stone-200/70 bg-white/70 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/50 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto">
              {nav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "shrink-0 rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors",
                      isActive
                        ? "text-stone-900 dark:text-stone-50 border-b-2 border-stone-900 dark:border-stone-50 hover:text-stone-900 dark:hover:text-stone-50"
                        : "text-stone-600 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-stone-50",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                className="cb-btn cb-btn-secondary px-3 py-2 text-xs"
              >
                Sign out
              </button>
            </form>
          </div>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
