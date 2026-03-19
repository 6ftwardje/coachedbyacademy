"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/"
            className="font-semibold text-stone-900 text-lg hover:text-stone-700"
          >
            CoachedBy Academy
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
            <h1 className="text-xl font-semibold text-stone-900 mb-1">
              Sign in
            </h1>
            <p className="text-stone-600 text-sm mb-6">
              Enter your email and we’ll send you a magic link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent disabled:opacity-60"
                />
              </div>

              {message && (
                <p
                  role="alert"
                  className={`text-sm ${
                    status === "error" ? "text-red-600" : "text-stone-600"
                  }`}
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="w-full rounded-xl bg-stone-900 text-white py-2.5 text-sm font-medium hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
              >
                {status === "loading"
                  ? "Sending…"
                  : status === "success"
                    ? "Check your email"
                    : "Send magic link"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-stone-500 text-sm">
            <Link href="/" className="hover:text-stone-700">
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-stone-50">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <Link href="/" className="font-semibold text-stone-900 text-lg">CoachedBy Academy</Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm p-8 animate-pulse">
            <div className="h-6 w-24 bg-stone-200 rounded mb-2" />
            <div className="h-4 w-48 bg-stone-100 rounded mb-6" />
            <div className="h-10 bg-stone-100 rounded mb-4" />
            <div className="h-10 bg-stone-200 rounded" />
          </div>
        </main>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
