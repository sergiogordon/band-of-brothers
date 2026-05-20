"use client";

import { useMemo, useState } from "react";
import { members, memberById } from "@/data/members";
import { futureEventSlots } from "@/data/events";
import { PLACEMENT_POINTS, PLACEMENTS } from "@/data/scoring";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  applyPlacements,
  getCurrentPointsMap,
  rankMembers,
  validatePlacements,
} from "@/lib/points";
import type { EventPlacement, Placement } from "@/lib/types";

type SimEvent = {
  slotId: string;
  placements: Record<string, Placement | "">;
  modeled: boolean;
};

function emptyPlacements(): Record<string, Placement | ""> {
  return Object.fromEntries(members.map((m) => [m.id, ""]));
}

function newSimEvent(slotId: string): SimEvent {
  return { slotId, placements: emptyPlacements(), modeled: false };
}

function placementsToFilled(
  placements: Record<string, Placement | "">,
): EventPlacement[] {
  const filled: EventPlacement[] = [];
  for (const m of members) {
    const p = placements[m.id];
    if (p !== "") filled.push({ memberId: m.id, placement: p });
  }
  return filled;
}

function isEventComplete(placements: Record<string, Placement | "">): boolean {
  return members.every((m) => placements[m.id] !== "");
}

function usedPlacements(
  placements: Record<string, Placement | "">,
  excludeMemberId: string,
): Set<Placement> {
  const used = new Set<Placement>();
  for (const m of members) {
    if (m.id === excludeMemberId) continue;
    const p = placements[m.id];
    if (p !== "") used.add(p);
  }
  return used;
}

function placementLabel(p: Placement): string {
  const suffix =
    p === 1 ? "st" : p === 2 ? "nd" : p === 3 ? "rd" : "th";
  return `${p}${suffix} (+${PLACEMENT_POINTS[p]})`;
}

export function Simulator() {
  const basePoints = getCurrentPointsMap();
  const baseRanked = rankMembers(basePoints);
  const [simEvents, setSimEvents] = useState<SimEvent[]>([
    newSimEvent(futureEventSlots[0].id),
  ]);
  const [eventErrors, setEventErrors] = useState<Record<number, string>>({});

  const hasModeledEvents = simEvents.some((e) => e.modeled);

  const { projectedPoints, leaderId, rankDiffs } = useMemo(() => {
    let points = { ...basePoints };

    for (const sim of simEvents) {
      if (!sim.modeled) continue;
      const filled = placementsToFilled(sim.placements);
      points = applyPlacements(points, filled);
    }

    const ranked = rankMembers(points);
    const diffs = ranked.map((r) => {
      const base = baseRanked.find((b) => b.memberId === r.memberId)!;
      return { memberId: r.memberId, delta: base.rank - r.rank };
    });
    const leader = ranked[0];

    return {
      projectedPoints: points,
      leaderId: leader?.memberId,
      rankDiffs: diffs,
    };
  }, [simEvents, basePoints, baseRanked]);

  const projectedRanked = hasModeledEvents ? rankMembers(projectedPoints) : [];
  const baseLeaderId = baseRanked[0]?.memberId;
  const newLeader =
    hasModeledEvents &&
    leaderId &&
    baseLeaderId &&
    leaderId !== baseLeaderId
      ? memberById[leaderId]
      : null;

  function updatePlacement(
    eventIndex: number,
    memberId: string,
    placement: Placement | "",
  ) {
    setEventErrors((prev) => {
      const next = { ...prev };
      delete next[eventIndex];
      return next;
    });
    setSimEvents((prev) =>
      prev.map((e, i) =>
        i === eventIndex
          ? {
              ...e,
              modeled: false,
              placements: { ...e.placements, [memberId]: placement },
            }
          : e,
      ),
    );
  }

  function updateSlot(eventIndex: number, slotId: string) {
    setEventErrors((prev) => {
      const next = { ...prev };
      delete next[eventIndex];
      return next;
    });
    setSimEvents((prev) =>
      prev.map((e, i) =>
        i === eventIndex ? { ...e, slotId, modeled: false } : e,
      ),
    );
  }

  function modelEvent(eventIndex: number) {
    const sim = simEvents[eventIndex];
    const filled = placementsToFilled(sim.placements);
    const err = validatePlacements(filled);
    if (err) {
      setEventErrors((prev) => ({ ...prev, [eventIndex]: err }));
      return;
    }
    setEventErrors((prev) => {
      const next = { ...prev };
      delete next[eventIndex];
      return next;
    });
    setSimEvents((prev) =>
      prev.map((e, i) => (i === eventIndex ? { ...e, modeled: true } : e)),
    );
  }

  function addEvent() {
    if (simEvents.length >= futureEventSlots.length) return;
    const used = new Set(simEvents.map((e) => e.slotId));
    const next = futureEventSlots.find((s) => !used.has(s.id));
    if (!next) return;
    setSimEvents((prev) => [...prev, newSimEvent(next.id)]);
  }

  function removeEvent(index: number) {
    setEventErrors((prev) => {
      const next: Record<number, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        const i = Number(key);
        if (i < index) next[i] = value;
        else if (i > index) next[i - 1] = value;
      }
      return next;
    });
    setSimEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setEventErrors({});
    setSimEvents([newSimEvent(futureEventSlots[0].id)]);
  }

  const usedSlotIds = new Set(simEvents.map((e) => e.slotId));

  return (
    <section id="simulator" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            What-If Simulator
          </h2>
          <p className="text-sm text-slate-400">
            Model future event outcomes from current standings through December
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={addEvent}
            disabled={simEvents.length >= futureEventSlots.length}
            className="rounded-lg bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            + Add event
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-slate-700/50 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
        Scoring: 1st {PLACEMENT_POINTS[1]} · 2nd {PLACEMENT_POINTS[2]} · 3rd{" "}
        {PLACEMENT_POINTS[3]} · 4th {PLACEMENT_POINTS[4]} · 5th{" "}
        {PLACEMENT_POINTS[5]} · 6th {PLACEMENT_POINTS[6]}
      </div>

      <div className="space-y-6">
        {simEvents.map((sim, eventIndex) => {
          const complete = isEventComplete(sim.placements);
          const cardError = eventErrors[eventIndex];

          return (
            <div
              key={`${sim.slotId}-${eventIndex}`}
              className={`rounded-2xl border bg-slate-900/70 p-4 sm:p-6 ${
                sim.modeled
                  ? "border-emerald-600/40"
                  : "border-slate-700/50"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sim.slotId}
                    onChange={(e) => updateSlot(eventIndex, e.target.value)}
                    className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    {futureEventSlots.map((s) => {
                      const takenByOther =
                        usedSlotIds.has(s.id) && s.id !== sim.slotId;
                      return (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={takenByOther}
                        >
                          {s.label} (TBD)
                        </option>
                      );
                    })}
                  </select>
                  {sim.modeled && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      Modeled
                    </span>
                  )}
                </div>
                {simEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEvent(eventIndex)}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {members.map((m) => {
                  const taken = usedPlacements(sim.placements, m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-3 py-2"
                    >
                      <MemberAvatar memberId={m.id} size="sm" />
                      <span className="min-w-0 flex-1 text-sm font-medium text-white">
                        {m.name}
                      </span>
                      <select
                        value={sim.placements[m.id]}
                        onChange={(e) =>
                          updatePlacement(
                            eventIndex,
                            m.id,
                            e.target.value === ""
                              ? ""
                              : (Number(e.target.value) as Placement),
                          )
                        }
                        className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white"
                      >
                        <option value="">—</option>
                        {PLACEMENTS.map((p) => {
                          const disabled =
                            taken.has(p) && sim.placements[m.id] !== p;
                          return (
                            <option
                              key={p}
                              value={p}
                              disabled={disabled}
                              className={disabled ? "text-slate-600" : ""}
                            >
                              {placementLabel(p)}
                              {disabled ? " (taken)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  );
                })}
              </div>

              {cardError && (
                <p className="mt-3 text-sm text-amber-300/90">{cardError}</p>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => modelEvent(eventIndex)}
                  disabled={!complete}
                  className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Model
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {!hasModeledEvents ? (
          <p className="text-sm text-slate-500">
            Model an event to see projected standings.
          </p>
        ) : (
          <>
            {newLeader && (
              <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-amber-200">
                New season leader: <strong>{newLeader.name}</strong>
              </div>
            )}

            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Projected standings
            </h3>
            <div className="space-y-2">
              {projectedRanked.map((entry) => {
                const member = memberById[entry.memberId];
                const base = baseRanked.find(
                  (b) => b.memberId === entry.memberId,
                )!;
                const diff = rankDiffs.find(
                  (d) => d.memberId === entry.memberId,
                )!;
                const ptsGained = entry.points - base.points;

                return (
                  <div
                    key={entry.memberId}
                    className="flex items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3"
                  >
                    <span className="w-6 text-center text-sm font-bold text-slate-500">
                      {entry.rank}
                    </span>
                    <MemberAvatar memberId={entry.memberId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-slate-400">
                        Was #{base.rank}
                        {diff.delta > 0 && (
                          <span className="text-emerald-400">
                            {" "}
                            ↑{diff.delta}
                          </span>
                        )}
                        {diff.delta < 0 && (
                          <span className="text-red-400">
                            {" "}
                            ↓{Math.abs(diff.delta)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">
                        {entry.points}
                      </p>
                      {ptsGained > 0 && (
                        <p className="text-xs text-emerald-400">+{ptsGained}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
