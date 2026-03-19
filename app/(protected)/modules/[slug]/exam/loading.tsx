export default function ExamLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-4 w-24 bg-stone-100 rounded" />
      <div className="h-8 w-56 bg-stone-200 rounded-lg" />
      <div className="h-4 w-full max-w-xl bg-stone-100 rounded" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="h-4 w-32 bg-stone-100 rounded" />
            <div className="mt-2 h-5 w-full bg-stone-100 rounded" />
            <div className="mt-4 space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-12 bg-stone-50 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
