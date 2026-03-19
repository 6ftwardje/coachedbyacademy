export default function ModuleDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-20 bg-stone-100 rounded" />
      <div className="h-8 w-64 bg-stone-200 rounded-lg" />
      <div className="h-4 w-full max-w-xl bg-stone-100 rounded" />
      <div className="h-6 w-24 bg-stone-200 rounded" />
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="rounded-2xl border border-stone-200 bg-white p-4 h-20" />
        ))}
      </ul>
    </div>
  );
}
