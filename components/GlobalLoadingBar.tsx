"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const START_DELAY_MS = 80;
const MIN_VISIBLE_MS = 380;
const FINISH_MS = 220;
const MAX_ACTIVE_MS = 11_000;
const USER_EVENT_WINDOW_MS = 1_200;
const NAVIGATION_HANDOFF_MS = 1_600;
const FORM_HANDOFF_MS = 700;

type LoadingPhase = "idle" | "loading" | "finishing";
type TimerRef = { current: number | null };

function getLocationKey(url: URL) {
  return `${url.pathname}${url.search}`;
}

function getAnchor(event: MouseEvent) {
  const path = event.composedPath();
  const anchorFromPath = path.find(
    (target): target is HTMLAnchorElement =>
      target instanceof HTMLAnchorElement && target.hasAttribute("href")
  );

  if (anchorFromPath) {
    return anchorFromPath;
  }

  return event.target instanceof Element
    ? event.target.closest<HTMLAnchorElement>("a[href]")
    : null;
}

function isTrackableInternalLink(anchor: HTMLAnchorElement) {
  if (anchor.hasAttribute("download")) return false;

  const target = anchor.getAttribute("target");
  if (target && target.toLowerCase() !== "_self") return false;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const currentUrl = new URL(window.location.href);
  return getLocationKey(url) !== getLocationKey(currentUrl);
}

function isTrackableFetch(input: RequestInfo | URL, init?: RequestInit) {
  const now = window.performance.now();
  if (now > (window.__cbUserInteractionUntil ?? 0)) return false;

  const request =
    typeof Request !== "undefined" && input instanceof Request ? input : null;
  const signal = init?.signal ?? request?.signal;
  if (signal?.aborted) return false;

  const headers = new Headers(request?.headers);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const purpose = headers.get("purpose")?.toLowerCase();
  const secPurpose = headers.get("sec-purpose")?.toLowerCase();
  if (purpose === "prefetch" || secPurpose?.includes("prefetch")) {
    return false;
  }

  return !headers.has("next-router-prefetch");
}

declare global {
  interface Window {
    __cbUserInteractionUntil: number;
  }
}

export function GlobalLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<LoadingPhase>("idle");
  const phaseRef = useRef<LoadingPhase>("idle");
  const activeCountRef = useRef(0);
  const visibleSinceRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);
  const handoffTimersRef = useRef(new Set<number>());
  const routeStopsRef = useRef(new Set<() => void>());
  const lastLocationKeyRef = useRef("");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    window.__cbUserInteractionUntil = 0;
    const handoffTimers = handoffTimersRef.current;
    const routeStops = routeStopsRef.current;

    function clearTimer(timer: TimerRef) {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    }

    function markUserInteraction() {
      window.__cbUserInteractionUntil =
        window.performance.now() + USER_EVENT_WINDOW_MS;
    }

    function forceComplete() {
      routeStops.forEach((stop) => stop());
      routeStops.clear();
      activeCountRef.current = 0;
      finish();
    }

    function scheduleHandoff(
      stop: () => void,
      ms: number,
      onComplete?: () => void
    ) {
      const timer = window.setTimeout(() => {
        handoffTimers.delete(timer);
        onComplete?.();
        stop();
      }, ms);
      handoffTimers.add(timer);
    }

    function show() {
      startTimerRef.current = null;
      visibleSinceRef.current = window.performance.now();
      setPhase("loading");
    }

    function begin() {
      activeCountRef.current += 1;

      clearTimer(finishTimerRef);
      clearTimer(idleTimerRef);

      if (phaseRef.current === "idle" && startTimerRef.current === null) {
        startTimerRef.current = window.setTimeout(show, START_DELAY_MS);
      } else if (phaseRef.current === "finishing") {
        visibleSinceRef.current = window.performance.now();
        setPhase("loading");
      }

      if (maxTimerRef.current === null) {
        maxTimerRef.current = window.setTimeout(forceComplete, MAX_ACTIVE_MS);
      }

      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        activeCountRef.current = Math.max(0, activeCountRef.current - 1);
        if (activeCountRef.current === 0) {
          finish();
        }
      };
    }

    function finish() {
      if (activeCountRef.current > 0) return;

      clearTimer(startTimerRef);
      clearTimer(maxTimerRef);

      if (phaseRef.current === "idle") {
        setPhase("idle");
        return;
      }

      const elapsed = window.performance.now() - visibleSinceRef.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      finishTimerRef.current = window.setTimeout(() => {
        finishTimerRef.current = null;
        setPhase("finishing");
        idleTimerRef.current = window.setTimeout(() => {
          idleTimerRef.current = null;
          if (activeCountRef.current === 0) {
            setPhase("idle");
          }
        }, FINISH_MS);
      }, wait);
    }

    function onClick(event: MouseEvent) {
      markUserInteraction();

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = getAnchor(event);
      if (!anchor || !isTrackableInternalLink(anchor)) return;

      const stop = begin();
      routeStops.add(stop);
      scheduleHandoff(stop, NAVIGATION_HANDOFF_MS, () => {
        routeStops.delete(stop);
      });
    }

    function onSubmit(event: SubmitEvent) {
      markUserInteraction();

      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || (form.checkValidity && !form.checkValidity())) return;

      const stop = begin();
      scheduleHandoff(stop, FORM_HANDOFF_MS);
    }

    function onPopState() {
      const nextKey = getLocationKey(new URL(window.location.href));
      if (nextKey === lastLocationKeyRef.current) return;

      const stop = begin();
      routeStops.add(stop);
      scheduleHandoff(stop, NAVIGATION_HANDOFF_MS, () => {
        routeStops.delete(stop);
      });
    }

    const originalFetch = window.fetch;
    const trackedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (!isTrackableFetch(input, init)) {
        return originalFetch.call(window, input, init);
      }

      const stop = begin();

      try {
        return originalFetch.call(window, input, init).finally(stop);
      } catch (error) {
        stop();
        throw error;
      }
    }) as typeof window.fetch;
    window.fetch = trackedFetch;

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
      if (window.fetch === trackedFetch) {
        window.fetch = originalFetch;
      }
      handoffTimers.forEach((timer) => window.clearTimeout(timer));
      handoffTimers.clear();
      routeStops.clear();
      activeCountRef.current = 0;
      clearTimer(startTimerRef);
      clearTimer(finishTimerRef);
      clearTimer(idleTimerRef);
      clearTimer(maxTimerRef);
    };
  }, []);

  useEffect(() => {
    const query = searchParams.toString();
    lastLocationKeyRef.current = `${pathname}${query ? `?${query}` : ""}`;
    routeStopsRef.current.forEach((stop) => stop());
    routeStopsRef.current.clear();
  }, [pathname, searchParams]);

  return (
    <div
      className="cb-global-loading-bar"
      data-state={phase}
      aria-hidden="true"
    />
  );
}
