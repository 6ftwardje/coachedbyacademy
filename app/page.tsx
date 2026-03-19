import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-stone-900 text-lg">
            CoachedBy Academy
          </span>
          <Link
            href="/login"
            className="text-stone-600 hover:text-stone-900 text-sm font-medium"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 text-center max-w-xl mb-4">
          Premium coach education
        </h1>
        <p className="text-stone-600 text-center max-w-md mb-10">
          Learn, certify, and stand out as a coach. A focused learning experience
          built for serious practitioners.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-stone-900 text-white px-6 py-3 text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          Get started
        </Link>
      </main>

      <footer className="border-t border-stone-200 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center text-stone-500 text-sm">
          CoachedBy Academy
        </div>
      </footer>
    </div>
  );
}
