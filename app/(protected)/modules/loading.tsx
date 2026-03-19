export default function ModulesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-32 bg-stone-200 rounded-lg" />
      <div className="h-4 w-64 bg-stone-100 rounded" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6 h-40" />
        ))}
      </div>
    </div>
  );
}
