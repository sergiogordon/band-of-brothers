"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useSeasonState } from "@/components/SeasonProvider";
import { futureEventSlots } from "@/data/events";
import { memberById, members } from "@/data/members";
import { PLACEMENTS, placementLabel } from "@/data/scoring";
import { rankMembers } from "@/lib/points";
import {
  emptyPlacementMap,
  getFutureSlot,
  getPlacementStatus,
  isCompletedResult,
  placementsRecordToFilled,
} from "@/lib/season-results";
import type { Placement, StoredEventResult } from "@/lib/types";

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

type EventTypeInputProps = {
  resultId: string;
  value: string;
  onCommit: (resultId: string, value: string) => void;
};

function EventTypeInput({ resultId, value, onCommit }: EventTypeInputProps) {
  const [draft, setDraft] = useState(value);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (draft === value) return;

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      onCommit(resultId, draft);
      saveTimeoutRef.current = null;
    }, 350);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [draft, onCommit, resultId, value]);

  function flushDraft() {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (draft !== value) {
      onCommit(resultId, draft);
    }
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={flushDraft}
      placeholder="Type"
      className="mt-2 block w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-sm normal-case tracking-normal text-stone-50"
    />
  );
}

export function EventResultsManager() {
  const {
    addResult,
    removeResult,
    resetResults,
    publishResult,
    state,
    updateResult,
    isSyncing,
    syncError,
    adminKey,
    setAdminKey,
    getLivePointsMap,
  } = useSeasonState();
  const results = state.drafts;

  const usedSlotIds = useMemo(() => {
    const used = new Set(results.map((result) => result.slotId));

    for (const event of state.events) {
      const publishedSlot = futureEventSlots.find(
        (slot) =>
          event.id === `${slot.id}-result` ||
          event.date.startsWith(`${slot.year}-${String(slot.month).padStart(2, "0")}`),
      );
      if (publishedSlot) used.add(publishedSlot.id);
    }

    return used;
  }, [results, state.events]);
  const nextAvailableSlot = futureEventSlots.find(
    (slot) => !usedSlotIds.has(slot.id),
  );
  const ranked = useMemo(() => rankMembers(getLivePointsMap()), [getLivePointsMap]);
  const completedCount = results.filter(isCompletedResult).length;
  const nextPublishableResultId = results[0]?.id ?? null;

  function updateResultField<K extends keyof StoredEventResult>(
    resultId: string,
    key: K,
    value: StoredEventResult[K],
  ) {
    updateResult(resultId, (result) => ({ ...result, [key]: value }));
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
                Add July and every month after it. Draft changes sync across
                devices, then Add this event publishes the final scores.
                {isSyncing ? " Syncing…" : ""}
                {syncError ? ` ${syncError}` : ""}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-emerald-300/75">
                Scoring: {PLACEMENTS.map(placementLabel).join(" · ")}
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-72">
              <label className="text-xs font-semibold uppercase tracking-widest text-emerald-300/70">
                Admin key
                <input
                  type="password"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Required to save"
                  className="mt-2 block w-full rounded-lg border border-emerald-800/70 bg-[#030806] px-3 py-2 text-sm normal-case tracking-normal text-stone-50"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => nextAvailableSlot && void addResult(nextAvailableSlot.id)}
                disabled={!nextAvailableSlot}
                className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add month
              </button>
              <button
                type="button"
                onClick={() => void resetResults()}
                disabled={results.length === 0}
                className="rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear saved
              </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-emerald-900/45 bg-[#07100d]/75 p-6 shadow-inner shadow-stone-950/70">
              <h2 className="text-xl font-semibold text-stone-50">
                Start with {futureEventSlots[0].label}
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Add the next event, enter each placement, then keep adding the
                next month as the season rolls forward.
              </p>
              <button
                type="button"
                onClick={() => void addResult(futureEventSlots[0].id)}
                className="mt-5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300"
              >
                Add {futureEventSlots[0].label}
              </button>
            </div>
          ) : (
            results.map((result) => {
              const status = getPlacementStatus(result.placements);
              const assignedCount = placementsRecordToFilled(result.placements).length;
              const slot = getFutureSlot(result.slotId);
              const isNextPublishable = result.id === nextPublishableResultId;
              const canPublish = status.complete && !status.duplicate && isNextPublishable;

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
                      onClick={() => void removeResult(result.id)}
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
                        disabled
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
                      <EventTypeInput
                        key={result.id}
                        resultId={result.id}
                        value={result.eventType}
                        onCommit={(resultId, value) =>
                          updateResultField(
                            resultId,
                            "eventType",
                            value,
                          )
                        }
                      />
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
                        : status.complete && !isNextPublishable
                          ? "Add earlier events before this one can update scores."
                        : status.complete
                          ? "Ready to add this event and update the scores."
                          : `${assignedCount}/6 placements entered. Preview updates as you go.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateResultField(result.id, "placements", emptyPlacementMap())
                        }
                        className="rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60"
                      >
                        Clear placements
                      </button>
                      <button
                        type="button"
                        onClick={() => void publishResult(result.id)}
                        disabled={!canPublish || isSyncing}
                        className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Add this event
                      </button>
                    </div>
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
                  {completedCount} completed draft
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
