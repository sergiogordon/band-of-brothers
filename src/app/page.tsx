import { Leaderboard } from "@/components/Leaderboard";
import { Punishments } from "@/components/Punishments";
import { SeasonTimeline } from "@/components/SeasonTimeline";
import { Simulator } from "@/components/Simulator";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-emerald-950/80 bg-[#030806]/85 shadow-[0_1px_0_rgba(244,239,228,0.04)] backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
            2026 Season
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-50 sm:text-5xl">
            Band of Brothers
          </h1>
          <p className="mt-2 max-w-xl text-stone-400">
            Monthly poker, competition, and chaos — points leaderboard through
            December.
          </p>
          <nav className="mt-6 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:gap-4">
            <a
              href="#leaderboard"
              className="rounded-lg border border-emerald-900/45 bg-emerald-950/25 px-3 py-2 text-center font-medium text-emerald-300 hover:text-stone-50 sm:border-0 sm:bg-transparent sm:p-0"
            >
              Leaderboard
            </a>
            <a
              href="#timeline"
              className="rounded-lg border border-emerald-900/45 bg-emerald-950/25 px-3 py-2 text-center text-stone-400 hover:text-stone-50 sm:border-0 sm:bg-transparent sm:p-0"
            >
              Timeline
            </a>
            <a
              href="#simulator"
              className="rounded-lg border border-emerald-900/45 bg-emerald-950/25 px-3 py-2 text-center text-stone-400 hover:text-stone-50 sm:border-0 sm:bg-transparent sm:p-0"
            >
              Simulator
            </a>
            <a
              href="#punishments"
              className="rounded-lg border border-emerald-900/45 bg-emerald-950/25 px-3 py-2 text-center text-stone-400 hover:text-stone-50 sm:border-0 sm:bg-transparent sm:p-0"
            >
              Punishments
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:space-y-20 sm:px-6 sm:py-16">
        <Leaderboard />
        <SeasonTimeline />
        <Simulator />
        <Punishments />
      </main>

      <footer className="border-t border-emerald-950/80 py-8 text-center text-xs text-stone-500">
        Band of Brothers · Everything can change on a dime
      </footer>
    </div>
  );
}
