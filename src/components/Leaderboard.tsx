import { memberById } from "@/data/members";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  formatEventDate,
  getLatestEvent,
  getCurrentPointsMap,
  rankMembers,
} from "@/lib/points";

const podiumStyles = [
  "border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-transparent",
  "border-slate-400/30 bg-gradient-to-b from-slate-400/15 to-transparent",
  "border-amber-700/30 bg-gradient-to-b from-amber-800/15 to-transparent",
];

export function Leaderboard() {
  const latest = getLatestEvent();
  const ranked = rankMembers(getCurrentPointsMap());
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <section id="leaderboard" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Season Leaderboard
          </h2>
          <p className="text-sm text-slate-400">
            Last updated: {latest.name} · {formatEventDate(latest.date)}
          </p>
        </div>
        <p className="text-xs uppercase tracking-widest text-amber-400/80">
          Cumulative points
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {podium.map((entry, i) => {
          const member = memberById[entry.memberId];
          const heights = ["sm:mt-0", "sm:mt-6", "sm:mt-10"];
          return (
            <div
              key={entry.memberId}
              className={`flex flex-col items-center rounded-2xl border p-5 ${podiumStyles[i]} ${heights[i]}`}
            >
              <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                #{entry.rank}
              </span>
              <MemberAvatar
                memberId={entry.memberId}
                size="sm"
                showRing={entry.rank === 1}
              />
              <p className="mt-3 text-lg font-semibold text-white">
                {member.name}
              </p>
              <p className="text-3xl font-bold text-amber-300">
                {entry.points}
              </p>
              {entry.gapToLeader > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  −{entry.gapToLeader} to lead
                </p>
              )}
              {entry.rank === 1 && (
                <p className="mt-2 text-xs font-medium text-amber-400">
                  Season leader
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {rest.map((entry) => {
          const member = memberById[entry.memberId];
          return (
            <div
              key={entry.memberId}
              className="flex items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 shadow-[0_0_24px_rgba(15,23,42,0.5)]"
            >
              <span className="w-6 text-center text-sm font-bold text-slate-500">
                {entry.rank}
              </span>
              <MemberAvatar memberId={entry.memberId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{member.name}</p>
                <p className="text-xs text-slate-400">
                  {entry.gapToLeader} pts behind leader
                </p>
              </div>
              <p className="text-xl font-bold text-white">{entry.points}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
