/**
 * Admin Supabase client (service role).
 * Use only in server-side code when you need to bypass RLS.
 * Not used in phase 1; create when needed (e.g. student bootstrap from backend).
 */

// import { createClient } from "@supabase/supabase-js";
//
// export function createAdminClient() {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !serviceRoleKey) throw new Error("Missing admin Supabase env");
//   return createClient(url, serviceRoleKey);
// }
