import Link from "next/link";
import type { AdminStudentListRow } from "@/lib/admin/types";
import { AccessLevelSelect } from "@/components/admin/AccessLevelSelect";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StudentsTable({
  rows,
  actorStudentId,
}: {
  rows: AdminStudentListRow[];
  actorStudentId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="cb-panel p-10 text-center">
        <p className="cb-body font-semibold text-[var(--foreground)]">No students found</p>
        <p className="cb-caption mt-2">Try adjusting search or sort.</p>
      </div>
    );
  }

  return (
    <div className="cb-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_92%,var(--background)_8%)]">
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Name
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Access
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-[var(--foreground)]">
                Last seen
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-[var(--foreground)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="border-b border-[var(--border)] transition-colors hover:bg-[color-mix(in_oklab,var(--card)_88%,var(--foreground)_2%)]"
              >
                <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--foreground)_25%,transparent)]"
                  >
                    {s.name?.trim() || "—"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[color-mix(in_oklab,var(--foreground)_88%,var(--muted))]">
                  {s.email}
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{s.phone?.trim() || "—"}</td>
                <td className="px-4 py-3">
                  <AccessLevelSelect
                    variant="inline"
                    studentId={s.id}
                    value={s.access_level}
                    actorStudentId={actorStudentId}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                  {formatDate(s.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">
                  {formatDate(s.last_seen)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/students/${s.id}`}
                    className="cb-btn cb-btn-secondary text-xs"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
