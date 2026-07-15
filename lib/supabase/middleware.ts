import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { timeAsync } from "@/lib/perf";
import { VERIFIED_AUTH_USER_ID_HEADER } from "@/lib/supabase/auth-context";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => /^sb-.*auth-token/.test(cookie.name));
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/modules") ||
    pathname.startsWith("/lessons") ||
    pathname.startsWith("/admin") ||
    pathname === "/account"
  );
}

function getInviteConfirmationRedirect(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  let inviteParams: URLSearchParams | null = null;

  if (pathname === "/" && searchParams.has("token_hash")) {
    inviteParams = searchParams;
  } else if (pathname.startsWith("/&token_hash=") && !request.nextUrl.search) {
    inviteParams = new URLSearchParams(pathname.slice(2));
  }

  const tokenHash = inviteParams?.get("token_hash") ?? "";
  if (
    inviteParams?.get("type") !== "invite" ||
    !/^[A-Za-z0-9_-]{20,256}$/.test(tokenHash)
  ) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/auth/confirm";
  url.search = "";
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "invite");
  url.searchParams.set("next", "/account/update-password");
  return url;
}

export async function updateSession(request: NextRequest) {
  const inviteConfirmationUrl = getInviteConfirmationRedirect(request);
  if (inviteConfirmationUrl) {
    return NextResponse.redirect(inviteConfirmationUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(VERIFIED_AUTH_USER_ID_HEADER);
  let refreshedCookies: CookieToSet[] = [];
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const applyRefreshedCookies = <T extends NextResponse>(response: T): T => {
    refreshedCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    );
    return response;
  };

  // In test environment mogen we niet terugvallen naar `/`.
  // Zo kunnen we de UI/flow testen zonder echte Supabase sessies.
  if (process.env.NODE_ENV === "test") {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const protectedPath = isProtectedPath(pathname);
  const authRoute = pathname.startsWith("/auth/");
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (authRoute) {
    return supabaseResponse;
  }

  if (protectedPath && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && !hasAuthCookie) {
    return supabaseResponse;
  }

  if (!protectedPath && pathname !== "/") {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        refreshedCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let verifiedUserId: string | null = null;

  if (process.env.PROJECT_SPEED_LOCAL_AUTH_CLAIMS === "on") {
    const { data, error } = await timeAsync(
      "[perf] middleware.auth.getClaims",
      () => supabase.auth.getClaims()
    );
    verifiedUserId =
      !error && typeof data?.claims?.sub === "string"
        ? data.claims.sub
        : null;
  } else {
    const {
      data: { user },
    } = await timeAsync("[perf] middleware.auth.getUser", () =>
      supabase.auth.getUser()
    );
    verifiedUserId = user?.id ?? null;
  }

  if (pathname === "/" && verifiedUserId) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return applyRefreshedCookies(NextResponse.redirect(url));
  }

  if (protectedPath && !verifiedUserId) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", pathname);
    return applyRefreshedCookies(NextResponse.redirect(url));
  }

  if (verifiedUserId) {
    requestHeaders.set(VERIFIED_AUTH_USER_ID_HEADER, verifiedUserId);
    supabaseResponse = applyRefreshedCookies(
      NextResponse.next({ request: { headers: requestHeaders } })
    );
  }

  return supabaseResponse;
}
