"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

/**
 * Wraps page content with the loading percentage + clip reveal.
 * Remounts on route change so each navigation replays the sequence.
 */
export function PageLoadOverlay({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return <LoadingOverlay key={pathname}>{children}</LoadingOverlay>;
}
