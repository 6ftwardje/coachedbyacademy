import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const origin = getRequestOrigin(request.headers, url.origin);
  return NextResponse.redirect(new URL("/", origin ?? url.origin), { status: 302 });
}
