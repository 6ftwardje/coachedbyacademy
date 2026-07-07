"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function ProtectedRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      homeHref="/dashboard"
      homeLabel="Naar dashboard"
    />
  );
}
