import Image from "next/image";
import { redirect } from "next/navigation";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?error=auth");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-950 px-5 py-10 text-stone-50">
      <section className="w-full max-w-md">
        <Image
          src="https://vldvzhxmyuybfpiezbcd.supabase.co/storage/v1/object/public/Assets/coachedbyclub_sitelogo.png"
          alt="CoachedBy Academy"
          width={220}
          height={64}
          className="mb-10 h-14 w-auto"
          priority
        />
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
          Account herstellen
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-white">
          Kies een nieuw wachtwoord
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Gebruik minimaal 8 tekens. Daarna kun je direct verder in de academy.
        </p>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
