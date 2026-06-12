import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { timeAsync } from "@/lib/perf";

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await timeAsync("[perf] middleware.auth.getUser", () =>
    supabase.auth.getUser()
  );

  if (pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (protectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
