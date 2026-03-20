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
    <div className="h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex h-full max-w-6xl mx-auto w-full min-h-0">
        <aside className="hidden md:flex md:w-56 md:shrink-0 h-full">
          <div className="flex h-full flex-col p-5">
            <div className="sticky top-0 z-20 pb-6 bg-[var(--background)]/80 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
              <div className="mb-7">
              <Link href="/dashboard" className="group inline-flex items-center">
                <img
                  src="https://vldvzhxmyuybfpiezbcd.supabase.co/storage/v1/object/public/Assets/coachedbyclub_sitelogo.png"
                  alt="CoachedBy Academy"
                  className="h-8 w-auto"
                  loading="eager"
                />
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

              <div className="bg-white border border-stone-200 rounded-xl p-2.5">
                <nav className="flex flex-col gap-1" aria-label="Main">
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
                          "relative block rounded-lg px-3 py-2 text-sm font-semibold tracking-tight transition-colors",
                          "border-l-2 border-transparent",
                          isActive
                            ? "bg-stone-50 text-stone-900 border-stone-900"
                            : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0 h-full">
          <div className="md:hidden sticky top-0 z-20 bg-[var(--background)]/80 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70 px-4 py-2 flex items-center justify-between gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-1.5 flex gap-1 overflow-x-auto">
              {nav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase transition-colors",
                      isActive
                        ? "bg-stone-50 text-stone-900"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
