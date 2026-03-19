export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-stone-200 rounded-lg" />
      <div className="h-4 w-72 bg-stone-100 rounded" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="h-4 w-24 bg-stone-100 rounded" />
            <div className="mt-2 h-8 w-16 bg-stone-200 rounded" />
          </div>
        ))}
      </div>
      <div className="h-6 w-32 bg-stone-200 rounded" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5 h-32" />
        ))}
      </div>
    </div>
  );
}
