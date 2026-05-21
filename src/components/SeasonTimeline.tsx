"use client";

import { useCallback, useState } from "react";
import { EventIcon } from "@/components/EventIcon";
import { MemberAvatar } from "@/components/MemberAvatar";
import { PointsRaceChart } from "@/components/PointsRaceChart";
import { useSeasonState } from "@/components/SeasonProvider";
import { memberById } from "@/data/members";
import { formatEventDate } from "@/lib/points";
import { getEventLeaderInfo } from "@/lib/timeline";

export function SeasonTimeline() {
  const { mergedEvents } = useSeasonState();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const handleActiveEventChange = useCallback((eventId: string | null) => {
    setActiveEventId(eventId);
  }, []);

  return (
    <section id="timeline" className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-stone-50">
          Season Timeline
        </h2>
        <p className="text-sm text-stone-400">
          Everyone starts at zero — watch the pack climb up and across the
          season
        </p>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mergedEvents.map((event) => {
          const { member } = getEventLeaderInfo(event);
          const standings = [...event.standings].sort(
            (a, b) => b.points - a.points,
          );
          const isActive = activeEventId === event.id;

          return (
            <article
              key={event.id}
              className={`rounded-2xl border bg-[#07100d]/75 p-4 shadow-inner shadow-stone-950/70 transition ${
                isActive
                  ? "border-emerald-300/60 ring-1 ring-emerald-300/25"
                  : "border-emerald-900/45"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                  <EventIcon type={event.eventType} size="sm" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/85">
                    {formatEventDate(event.date)}
                  </p>
                  <h3 className="mt-1 font-semibold text-stone-50">{event.name}</h3>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-emerald-900/45 pt-4">
                <MemberAvatar memberId={member.id} size="sm" showRing />
                <div>
                  <p className="text-xs text-stone-400">Leader</p>
                  <p className="font-medium text-stone-50">{member.name}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {standings.map((s, i) => (
                  <li
                    key={s.memberId}
                    className="flex justify-between text-sm text-stone-300"
                  >
                    <span>
                      {i + 1}. {memberById[s.memberId].name}
                    </span>
                    <span className="font-mono text-stone-400">{s.points}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <PointsRaceChart
        events={mergedEvents}
        onActiveEventChange={handleActiveEventChange}
      />
    </section>
  );
}
