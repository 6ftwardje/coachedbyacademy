"use client";

import { useEffect } from "react";

export function RouteErrorFallback({
  error,
  reset,
  title = "Deze pagina kon niet geladen worden",
  description = "Probeer opnieuw. Als de sessie of verbinding kort onderbroken werd, herstelt de pagina meestal meteen.",
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref: string;
  homeLabel: string;
}) {
  useEffect(() => {
    console.error("Route render failed", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[52vh] w-full max-w-2xl items-center">
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_1px_0_rgba(28,25,23,0.04)] sm:p-8">
        <div className="cb-eyebrow">Pagina niet beschikbaar</div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 cb-body">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="cb-btn cb-btn-primary">
            Opnieuw proberen
          </button>
          <a href={homeHref} className="cb-btn cb-btn-secondary">
            {homeLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
