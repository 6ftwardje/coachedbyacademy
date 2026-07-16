"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function AdminRouteError({
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
      title="Admin kon niet geladen worden"
      homeHref="/dashboard"
      homeLabel="Terug naar Mentorship"
    />
  );
}
