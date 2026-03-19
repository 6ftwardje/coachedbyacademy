export default function AccountLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-24 bg-stone-200 rounded-lg" />
      <div className="h-4 w-48 bg-stone-100 rounded" />
      <div className="rounded-2xl border border-stone-200 bg-white p-6 max-w-xl space-y-4">
        <div className="h-4 w-12 bg-stone-100 rounded" />
        <div className="h-5 w-48 bg-stone-200 rounded" />
        <div className="h-4 w-12 bg-stone-100 rounded" />
        <div className="h-5 w-32 bg-stone-200 rounded" />
      </div>
    </div>
  );
}
