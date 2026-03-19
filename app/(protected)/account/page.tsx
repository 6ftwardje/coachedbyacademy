import { ensureCurrentStudent } from "@/lib/students";

export default async function AccountPage() {
  const { student } = await ensureCurrentStudent();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Account</h1>
        <p className="text-stone-600 mt-1">
          Your profile and account details.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm max-w-xl">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Name</dt>
            <dd className="mt-0.5 text-stone-900">
              {student?.name ?? "Not set"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Email</dt>
            <dd className="mt-0.5 text-stone-900">{student?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Access level</dt>
            <dd className="mt-0.5 text-stone-900">{student?.access_level ?? 1}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-stone-500">
          Profile editing can be added in a later phase.
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="text-stone-600 hover:text-stone-900 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
