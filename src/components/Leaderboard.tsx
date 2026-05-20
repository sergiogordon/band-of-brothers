"use client";

import { memberById } from "@/data/members";
import { LeaderboardPhotoViewer } from "@/components/LeaderboardPhotoViewer";
import { useStoredSeasonResults } from "@/hooks/useStoredSeasonResults";
import {
  formatEventDate,
  getLatestEvent,
  rankMembers,
} from "@/lib/points";
import {
  buildCompletedEventSnapshots,
  getLatestPointsMapWithStoredResults,
} from "@/lib/season-results";

const EVENT_SWING_POINTS = 60;

const podiumStyles: Record<number, string> = {
  1: "order-1 border-[#d6b35a]/55 bg-[linear-gradient(180deg,rgba(214,179,90,0.12),rgba(12,35,28,0.72)_42%,rgba(5,12,10,0.94))] shadow-[0_0_48px_rgba(25,169,116,0.2)] sm:order-2 sm:-mt-4 sm:min-h-72",
  2: "order-2 border-stone-400/25 bg-[linear-gradient(180deg,rgba(244,239,228,0.08),rgba(9,24,28,0.72)_44%,rgba(5,12,10,0.94))] sm:order-1 sm:mt-8",
  3: "order-3 border-red-900/45 bg-[linear-gradient(180deg,rgba(124,32,47,0.14),rgba(20,13,15,0.74)_44%,rgba(5,12,10,0.94))] sm:mt-12",
};

function raceNote(gap: number): string {
  if (gap === 0) return "Season leader";
  if (gap <= 15) return "Within striking distance";
  if (gap <= EVENT_SWING_POINTS) return "One big event back";
  return `${Math.ceil(gap / EVENT_SWING_POINTS)} events back`;
}

export function Leaderboard() {
  const { results } = useStoredSeasonResults();
  const completedResultEvents = buildCompletedEventSnapshots(results);
  const latest =
    completedResultEvents[completedResultEvents.length - 1] ?? getLatestEvent();
  const ranked = rankMembers(getLatestPointsMapWithStoredResults(results));
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const leader = ranked[0];
  const challenger = ranked[1];
  const third = ranked[2];
  const leaderMember = memberById[leader.memberId];
  const challengerMember = challenger ? memberById[challenger.memberId] : null;
  const leaderPoints = Math.max(leader.points, 1);
  const topThreeSpread = third ? leader.points - third.points : 0;

  return (
    <section id="leaderboard" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-50">
            Season Leaderboard
          </h2>
          <p className="text-sm text-stone-400">
            Last updated: {latest.name} · {formatEventDate(latest.date)}
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest text-emerald-300/80">
          Cumulative points
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-800/40 bg-[#06110e]/75 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/70">
            Current leader
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-50">
            {leaderMember.name} <span className="text-[#d6b35a]">{leader.points}</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-800/40 bg-[#06110e]/75 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/70">
            Closest challenger
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-50">
            {challengerMember?.name ?? "TBD"}{" "}
            <span className="text-stone-400">
              {challenger ? `${challenger.gapToLeader} back` : ""}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-800/40 bg-[#06110e]/75 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/70">
            Top-three spread
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-50">
            {topThreeSpread} points
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3 sm:items-end">
        {podium.map((entry) => {
          const member = memberById[entry.memberId];
          const progress = Math.round((entry.points / leaderPoints) * 100);
          return (
            <div
              key={entry.memberId}
              className={`flex flex-col items-center rounded-xl border p-4 shadow-inner shadow-stone-950/80 sm:rounded-2xl sm:p-5 ${podiumStyles[entry.rank]}`}
            >
              <div className="mb-3 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <span className={entry.rank === 1 ? "text-[#d6b35a]" : "text-emerald-300/75"}>
                  #{entry.rank}
                </span>
                <span className="text-stone-500">{raceNote(entry.gapToLeader)}</span>
              </div>
              <LeaderboardPhotoViewer
                name={member.name}
                avatar={member.avatar}
                size={entry.rank === 1 ? "lg" : "md"}
                showRing={entry.rank === 1}
                ringClassName="ring-[#d6b35a]/80"
              />
              <p className="mt-4 text-lg font-semibold text-stone-50">
                {member.name}
              </p>
              <p className={entry.rank === 1 ? "text-4xl font-bold text-[#d6b35a]" : "text-3xl font-bold text-stone-100"}>
                {entry.points}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {entry.gapToLeader > 0 ? `${entry.gapToLeader} back` : "At the table lead"}
              </p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-900">
                <div
                  className={entry.rank === 1 ? "h-full rounded-full bg-[#d6b35a]" : "h-full rounded-full bg-emerald-400/80"}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {rest.map((entry) => {
          const member = memberById[entry.memberId];
          const progress = Math.round((entry.points / leaderPoints) * 100);
          return (
            <div
              key={entry.memberId}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-emerald-900/45 bg-[#07100d]/75 px-3 py-3 shadow-[0_0_24px_rgba(0,0,0,0.28)] sm:grid-cols-[auto_auto_1fr_auto] sm:px-4"
            >
              <span className="w-6 text-center text-sm font-bold text-stone-500">
                {entry.rank}
              </span>
              <LeaderboardPhotoViewer
                name={member.name}
                avatar={member.avatar}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="font-medium text-stone-50">{member.name}</p>
                  <p className="text-xs text-stone-400">
                    {entry.gapToLeader} pts behind leader
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-900">
                  <div
                    className="h-full rounded-full bg-emerald-500/65"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-emerald-300/60">
                  {raceNote(entry.gapToLeader)}
                </p>
              </div>
              <p className="text-xl font-bold text-stone-50">{entry.points}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
