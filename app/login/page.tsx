"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <img
            src="https://vldvzhxmyuybfpiezbcd.supabase.co/storage/v1/object/public/Assets/coachedbyclub_sitelogo.png"
            alt="CoachedBy Academy"
            className="h-14 w-auto"
            loading="eager"
          />
        </div>

        <div className="rounded-2xl border border-stone-800/70 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold text-stone-50 mb-1">
            Sign in
          </h1>
          <p className="text-stone-200/90 text-sm mb-6">
            Enter your email and we’ll send you a magic link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-200 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={status === "loading" || status === "success"}
                autoComplete="email"
                className="w-full rounded-xl border border-stone-700 bg-white/5 px-4 py-2.5 text-stone-50 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500/70 focus:border-transparent disabled:opacity-60"
              />
            </div>

            {message && (
              <p
                role="alert"
                className={`text-sm ${
                  status === "error"
                    ? "text-red-400"
                    : "text-stone-200/90"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="w-full cb-btn cb-btn-primary disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {status === "loading"
                ? "Sending…"
                : status === "success"
                  ? "Check your email"
                  : "Send magic link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)] text-[var(--foreground)]">
        <div className="w-full max-w-md space-y-6 animate-pulse">
          <div className="h-14 w-40 bg-stone-700/60 rounded" />
          <div className="rounded-2xl border border-stone-800/70 bg-white/5 p-8">
            <div className="h-8 w-28 bg-stone-700/60 rounded mb-4" />
            <div className="h-4 w-64 bg-stone-700/60 rounded mb-8" />
            <div className="h-12 w-full bg-stone-700/60 rounded mb-5" />
            <div className="h-10 w-full bg-stone-700/60 rounded" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
