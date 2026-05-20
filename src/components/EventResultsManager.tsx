"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { futureEventSlots } from "@/data/events";
import { memberById, members } from "@/data/members";
import { PLACEMENT_POINTS, PLACEMENTS } from "@/data/scoring";
import { useStoredSeasonResults } from "@/hooks/useStoredSeasonResults";
import { rankMembers } from "@/lib/points";
import {
  defaultEventDate,
  emptyPlacementMap,
  getFutureSlot,
  getLivePointsMap,
  getPlacementStatus,
  isCompletedResult,
  placementsRecordToFilled,
} from "@/lib/season-results";
import type { EventType, Placement, StoredEventResult } from "@/lib/types";

const eventTypeOptions: { value: EventType; label: string }[] = [
  { value: "poker", label: "Poker" },
  { value: "golf", label: "Golf" },
  { value: "bowling", label: "Bowling" },
];

function placementLabel(placement: Placement): string {
  const suffix =
    placement === 1 ? "st" : placement === 2 ? "nd" : placement === 3 ? "rd" : "th";
  return `${placement}${suffix} (+${PLACEMENT_POINTS[placement]})`;
}

function usedPlacements(
  result: StoredEventResult,
  excludeMemberId: string,
): Set<Placement> {
  const used = new Set<Placement>();

  for (const member of members) {
    if (member.id === excludeMemberId) continue;
    const placement = result.placements[member.id];
    if (placement !== "") used.add(placement);
  }

  return used;
}

export function EventResultsManager() {
  const {
    addResult,
    removeResult,
    resetResults,
    results,
    updateResult,
  } = useStoredSeasonResults();

  const usedSlotIds = useMemo(
    () => new Set(results.map((result) => result.slotId)),
    [results],
  );
  const nextAvailableSlot = futureEventSlots.find(
    (slot) => !usedSlotIds.has(slot.id),
  );
  const ranked = useMemo(() => rankMembers(getLivePointsMap(results)), [results]);
  const completedCount = results.filter(isCompletedResult).length;

  function updateResultField<K extends keyof StoredEventResult>(
    resultId: string,
    key: K,
    value: StoredEventResult[K],
  ) {
    updateResult(resultId, (result) => ({ ...result, [key]: value }));
  }

  function changeSlot(resultId: string, slotId: string) {
    const slot = getFutureSlot(slotId);
    if (!slot) return;

    updateResult(resultId, (result) => ({
      ...result,
      id: `${slot.id}-result`,
      slotId: slot.id,
      name: `${slot.label} Event`,
      date: defaultEventDate(slot),
    }));
  }

  function updatePlacement(
    resultId: string,
    memberId: string,
    placement: Placement | "",
  ) {
    updateResult(resultId, (result) => ({
      ...result,
      placements: { ...result.placements, [memberId]: placement },
    }));
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-emerald-950/80 bg-[#030806]/85 shadow-[0_1px_0_rgba(244,239,228,0.04)] backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-300 hover:text-stone-50"
          >
            Back to leaderboard
          </Link>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
                Results Entry
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-50 sm:text-5xl">
                Future Event Placements
              </h1>
              <p className="mt-2 max-w-2xl text-stone-400">
                Add June and every month after it. Changes preview immediately
                here, and completed valid months update the main leaderboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => nextAvailableSlot && addResult(nextAvailableSlot.id)}
                disabled={!nextAvailableSlot}
                className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add month
              </button>
              <button
                type="button"
                onClick={resetResults}
                disabled={results.length === 0}
                className="rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear saved
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-emerald-900/45 bg-[#07100d]/75 p-6 shadow-inner shadow-stone-950/70">
              <h2 className="text-xl font-semibold text-stone-50">
                Start with June
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Add the June event, enter each placement, then keep adding the
                next month as the season rolls forward.
              </p>
              <button
                type="button"
                onClick={() => addResult(futureEventSlots[0].id)}
                className="mt-5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300"
              >
                Add June 2026
              </button>
            </div>
          ) : (
            results.map((result) => {
              const status = getPlacementStatus(result.placements);
              const assignedCount = placementsRecordToFilled(result.placements).length;
              const slot = getFutureSlot(result.slotId);

              return (
                <article
                  key={result.id}
                  className="rounded-2xl border border-emerald-900/45 bg-[#07100d]/75 p-4 shadow-inner shadow-stone-950/70 sm:p-6"
                >
                  <div className="grid gap-3 border-b border-emerald-900/45 pb-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                        {slot?.label ?? "Future month"}
                      </p>
                      <input
                        value={result.name}
                        onChange={(event) =>
                          updateResultField(result.id, "name", event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-lg font-semibold text-stone-50 outline-none focus:border-emerald-400"
                        aria-label="Event name"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeResult(result.id)}
                      className="justify-self-start text-sm text-stone-500 hover:text-red-300 lg:justify-self-end"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                      Month
                      <select
                        value={result.slotId}
                        onChange={(event) => changeSlot(result.id, event.target.value)}
                        className="mt-2 block w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-sm normal-case tracking-normal text-stone-50"
                      >
                        {futureEventSlots.map((slotOption) => {
                          const takenByOther =
                            usedSlotIds.has(slotOption.id) &&
                            slotOption.id !== result.slotId;
                          return (
                            <option
                              key={slotOption.id}
                              value={slotOption.id}
                              disabled={takenByOther}
                            >
                              {slotOption.label}
                              {takenByOther ? " (already added)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                      Date
                      <input
                        type="date"
                        value={result.date}
                        onChange={(event) =>
                          updateResultField(result.id, "date", event.target.value)
                        }
                        className="mt-2 block w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-sm normal-case tracking-normal text-stone-50"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                      Type
                      <select
                        value={result.eventType}
                        onChange={(event) =>
                          updateResultField(
                            result.id,
                            "eventType",
                            event.target.value as EventType,
                          )
                        }
                        className="mt-2 block w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-sm normal-case tracking-normal text-stone-50"
                      >
                        {eventTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {members.map((member) => {
                      const taken = usedPlacements(result, member.id);

                      return (
                        <label
                          key={member.id}
                          className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-xl border border-emerald-900/45 bg-emerald-950/20 px-3 py-2 sm:flex"
                        >
                          <MemberAvatar memberId={member.id} size="sm" />
                          <span className="min-w-0 flex-1 text-sm font-medium text-stone-50">
                            {member.name}
                          </span>
                          <select
                            value={result.placements[member.id]}
                            onChange={(event) =>
                              updatePlacement(
                                result.id,
                                member.id,
                                event.target.value === ""
                                  ? ""
                                  : (Number(event.target.value) as Placement),
                              )
                            }
                            className="col-span-2 min-w-0 rounded border border-emerald-800/70 bg-[#030806] px-2 py-2 text-sm text-stone-50 sm:col-span-1 sm:py-1"
                          >
                            <option value="">Placement</option>
                            {PLACEMENTS.map((placement) => {
                              const disabled =
                                taken.has(placement) &&
                                result.placements[member.id] !== placement;

                              return (
                                <option
                                  key={placement}
                                  value={placement}
                                  disabled={disabled}
                                  className={disabled ? "text-stone-600" : ""}
                                >
                                  {placementLabel(placement)}
                                  {disabled ? " (taken)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-stone-400">
                      {status.duplicate
                        ? "Fix duplicate placements before this month can count."
                        : status.complete
                          ? "Complete. This month counts on the main leaderboard."
                          : `${assignedCount}/6 placements entered. Preview updates as you go.`}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        updateResultField(result.id, "placements", emptyPlacementMap())
                      }
                      className="self-start rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60 sm:self-auto"
                    >
                      Clear placements
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-emerald-900/45 bg-[#07100d]/80 p-4 shadow-inner shadow-stone-950/70 sm:p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-50">
                  Live Leaderboard
                </h2>
                <p className="text-xs text-stone-500">
                  {completedCount} completed saved month
                  {completedCount === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                Preview
              </span>
            </div>

            <div className="space-y-2">
              {ranked.map((entry) => {
                const member = memberById[entry.memberId];

                return (
                  <div
                    key={entry.memberId}
                    className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-emerald-900/45 bg-[#030806]/70 px-3 py-2"
                  >
                    <span className="w-5 text-center text-sm font-bold text-stone-500">
                      {entry.rank}
                    </span>
                    <MemberAvatar memberId={entry.memberId} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-50">
                        {member.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {entry.gapToLeader === 0
                          ? "Leader"
                          : `${entry.gapToLeader} back`}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-stone-50">
                      {entry.points}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
