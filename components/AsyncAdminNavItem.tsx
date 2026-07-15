"use client";

import { usePathname } from "next/navigation";
import { SidebarNavItem } from "@/components/SidebarNavItem";

export function AsyncAdminNavItem() {
  const pathname = usePathname();

  return (
    <SidebarNavItem
      href="/admin"
      label="Admin"
      active={pathname === "/admin" || pathname.startsWith("/admin/")}
      reloadDocument
      icon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3 3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-4Zm0 0v18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
    />
  );
}
