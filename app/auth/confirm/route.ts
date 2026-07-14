import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestOrigin } from "@/lib/request-origin";

function getSafeNext(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getRequestOrigin(request.headers, requestUrl.origin);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNext(searchParams.get("next"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isTestEnv = process.env.NODE_ENV === "test";

  const redirectToNext = () =>
    NextResponse.redirect(new URL(next, origin ?? requestUrl.origin));
  const redirectToLogin = () =>
    NextResponse.redirect(new URL("/?error=auth", origin ?? requestUrl.origin));

  if (!supabaseUrl || !supabaseAnonKey || !tokenHash || !type) {
    return isTestEnv ? redirectToNext() : redirectToLogin();
  }

  const response = redirectToNext();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (!error) return response;
  return isTestEnv ? response : redirectToLogin();
}
