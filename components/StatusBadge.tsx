import type { LessonStatus } from "@/lib/types";

export type ModuleState = "locked" | "available" | "completed";

export function ModuleStateBadge({ state }: { state: ModuleState }) {
  const label =
    state === "completed"
      ? "Completed"
      : state === "available"
        ? "Available"
        : "Locked";
  const cls =
    state === "completed"
      ? "cb-badge cb-badge-completed"
      : state === "available"
        ? "cb-badge cb-badge-available"
        : "cb-badge cb-badge-locked";
  return <span className={cls}>{label}</span>;
}

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  switch (status) {
    case "completed":
      return <span className="cb-badge cb-badge-completed">Completed</span>;
    case "available":
      return <span className="cb-badge cb-badge-available">Available</span>;
    case "locked":
      return <span className="cb-badge cb-badge-locked">Locked</span>;
    default:
      return <span className="cb-badge cb-badge-locked">Locked</span>;
  }
}
