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
          <h2 className="text-2xl font-bold tracking-tight text-stone-50">
            What-If Simulator
          </h2>
          <p className="text-sm text-stone-400">
            Model future event outcomes from current standings through December
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60 sm:py-1.5"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={addEvent}
            disabled={simEvents.length >= futureEventSlots.length}
            className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:opacity-40 sm:py-1.5"
          >
            + Add event
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-emerald-900/45 bg-emerald-950/20 px-4 py-3 text-xs text-stone-400">
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
              className={`rounded-2xl border bg-[#07100d]/75 p-4 shadow-inner shadow-stone-950/70 sm:p-6 ${
                sim.modeled
                  ? "border-emerald-600/40"
                  : "border-emerald-900/45"
              }`}
            >
              <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <select
                    value={sim.slotId}
                    onChange={(e) => updateSlot(eventIndex, e.target.value)}
                    className="min-w-0 rounded-lg border border-emerald-800/70 bg-[#06110e] px-3 py-2 text-sm text-stone-50"
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
                    className="justify-self-start text-xs text-stone-500 hover:text-red-300 sm:justify-self-auto"
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
                      className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-xl border border-emerald-900/45 bg-emerald-950/20 px-3 py-2 sm:flex"
                    >
                      <MemberAvatar memberId={m.id} size="sm" />
                      <span className="min-w-0 flex-1 text-sm font-medium text-stone-50">
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
                        className="col-span-2 min-w-0 rounded border border-emerald-800/70 bg-[#030806] px-2 py-2 text-sm text-stone-50 sm:col-span-1 sm:py-1"
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
                              className={disabled ? "text-stone-600" : ""}
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
                <p className="mt-3 text-sm text-[#d6b35a]">{cardError}</p>
              )}

              <div className="mt-4 flex justify-stretch sm:justify-end">
                <button
                  type="button"
                  onClick={() => modelEvent(eventIndex)}
                  disabled={!complete}
                  className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
          <p className="text-sm text-stone-500">
            Model an event to see projected standings.
          </p>
        ) : (
          <>
            {newLeader && (
              <div className="mb-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-center text-emerald-100">
                New season leader: <strong>{newLeader.name}</strong>
              </div>
            )}

            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-emerald-300/75">
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
                    className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-emerald-900/45 bg-[#07100d]/75 px-3 py-3 sm:gap-4 sm:px-4"
                  >
                    <span className="w-6 text-center text-sm font-bold text-stone-500">
                      {entry.rank}
                    </span>
                    <MemberAvatar memberId={entry.memberId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-50">{member.name}</p>
                      <p className="text-xs text-stone-400">
                        Was #{base.rank}
                        {diff.delta > 0 && (
                        <span className="text-emerald-300">
                            {" "}
                            ↑{diff.delta}
                          </span>
                        )}
                        {diff.delta < 0 && (
                        <span className="text-red-300">
                            {" "}
                            ↓{Math.abs(diff.delta)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-stone-50">
                        {entry.points}
                      </p>
                      {ptsGained > 0 && (
                        <p className="text-xs text-emerald-300">+{ptsGained}</p>
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
