export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="cb-dashboard-hero-bleed h-[50vh] max-h-[520px] overflow-hidden bg-stone-950 p-5 sm:p-7 lg:p-8">
        <div className="h-3 w-28 rounded bg-white/10" />
        <div className="mt-4 h-14 w-[72%] max-w-2xl rounded-xl bg-white/12" />

        <div className="mt-20 grid gap-6 border-t border-white/14 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-end">
          <div>
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="mt-5 h-4 w-44 rounded bg-white/10" />
            <div className="mt-3 h-10 w-[78%] rounded-lg bg-white/14" />
            <div className="mt-5 h-4 w-full rounded bg-white/10" />
            <div className="mt-2 h-4 w-[80%] rounded bg-white/10" />
          </div>
          <div className="border-white/14 lg:border-l lg:pl-8">
            <div className="h-4 w-36 rounded bg-white/10" />
            <div className="mt-3 h-4 w-full rounded bg-white/10" />
            <div className="mt-8 h-2 w-full rounded bg-white/10" />
            <div className="mt-6 h-11 w-44 rounded-xl bg-white/16" />
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 border-y border-stone-200 py-8 lg:grid-cols-[minmax(220px,320px)_minmax(0,680px)] lg:items-center lg:gap-10">
        <div>
          <div className="h-3 w-28 rounded bg-stone-100" />
          <div className="mt-3 h-7 w-48 rounded bg-stone-200" />
          <div className="mt-2 h-4 w-80 max-w-full rounded bg-stone-100" />
        </div>
        <div className="aspect-video w-full rounded-2xl border border-stone-200 bg-white lg:max-w-[680px]" />
      </div>

      <div className="mt-10">
        <div className="h-3 w-28 rounded bg-stone-100" />
        <div className="mt-3 h-7 w-48 rounded bg-stone-200" />
        <div className="mt-5 space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-28 rounded-2xl border border-stone-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
