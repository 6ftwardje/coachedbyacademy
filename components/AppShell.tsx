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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link
            href="/dashboard"
            className="font-semibold text-stone-900 text-lg hover:text-stone-700"
          >
            CoachedBy Academy
          </Link>
          <div className="flex items-center gap-4">
            {studentName && (
              <span className="hidden sm:inline text-stone-600 text-sm">
                {studentName}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-stone-500 hover:text-stone-800 text-sm font-medium"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        <aside className="hidden md:flex md:w-52 md:shrink-0 md:flex-col border-r border-stone-200 bg-white">
          <nav className="p-4 space-y-0.5" aria-label="Main">
            {nav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="md:hidden border-b border-stone-200 bg-white px-4 py-2 flex gap-2 overflow-x-auto">
            {nav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-stone-100 text-stone-900"
                      : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
