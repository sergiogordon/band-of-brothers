import { Leaderboard } from "@/components/Leaderboard";
import { SeasonTimeline } from "@/components/SeasonTimeline";
import { Simulator } from "@/components/Simulator";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            2026 Season
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Band of Brothers
          </h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Monthly poker, competition, and chaos — points leaderboard through
            December.
          </p>
          <nav className="mt-6 flex flex-wrap gap-4 text-sm">
            <a
              href="#leaderboard"
              className="text-amber-400/90 hover:text-amber-300"
            >
              Leaderboard
            </a>
            <a
              href="#timeline"
              className="text-slate-400 hover:text-white"
            >
              Timeline
            </a>
            <a
              href="#simulator"
              className="text-slate-400 hover:text-white"
            >
              Simulator
            </a>
            <a
              href="/punishments"
              className="text-slate-400 hover:text-white"
            >
              Punishments
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6 sm:py-16">
        <Leaderboard />
        <SeasonTimeline />
        <Simulator />
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        Band of Brothers · Everything can change on a dime
      </footer>
    </div>
  );
}
