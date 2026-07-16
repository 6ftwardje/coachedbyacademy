"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { PLATFORM_LOGO_SRC } from "@/lib/brand";

const OVERLAY_MS = 260;

interface LoadingOverlayProps {
  onComplete?: () => void;
  children?: React.ReactNode;
}

export function LoadingOverlay({ onComplete, children }: LoadingOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShowOverlay(false);
      onComplete?.();
    }, OVERLAY_MS);

    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center bg-[var(--background)] transition-opacity duration-300 ease-out motion-reduce:hidden"
        style={{ opacity: showOverlay ? 1 : 0 }}
        aria-hidden={!showOverlay}
      >
        <Image
          src={PLATFORM_LOGO_SRC}
          alt="Coachedby Mentorship"
          width={220}
          height={64}
          className="h-8 w-auto max-w-[min(40vw,200px)] select-none sm:h-9"
          priority
          decoding="async"
        />
      </div>

      {children}
    </>
  );
}
