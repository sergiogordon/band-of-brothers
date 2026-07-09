"use client";

import { useCallback, useState } from "react";
import { EventIcon } from "@/components/EventIcon";
import { MemberAvatar } from "@/components/MemberAvatar";
import { PointsRaceChart } from "@/components/PointsRaceChart";
import { useSeasonState } from "@/components/SeasonProvider";
import { memberById, members } from "@/data/members";
import { PLACEMENTS, placementLabel, pointsForPlacement } from "@/data/scoring";
import { formatEventDate, inferEventPlacements } from "@/lib/points";
import type { EventPlacement, Placement } from "@/lib/types";

function placementsToRecord(
  placements: EventPlacement[],
): Record<string, Placement | ""> {
  return Object.fromEntries(
    members.map((member) => [
      member.id,
      placements.find((placement) => placement.memberId === member.id)?.placement ?? "",
    ]),
  );
}

function usedPlacements(
  placements: Record<string, Placement | "">,
  excludeMemberId: string,
): Set<Placement> {
  const used = new Set<Placement>();

  for (const member of members) {
    if (member.id === excludeMemberId) continue;
    const placement = placements[member.id];
    if (placement !== "") used.add(placement);
  }

  return used;
}

export function SeasonTimeline() {
  const { isSyncing, mergedEvents, syncError, updateEventPlacements } =
    useSeasonState();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [placementDraft, setPlacementDraft] = useState<Record<
    string,
    Placement | ""
  > | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const handleActiveEventChange = useCallback((eventId: string | null) => {
    setActiveEventId(eventId);
  }, []);

  function beginEdit(eventId: string, placements: EventPlacement[]) {
    setEditingEventId(eventId);
    setPlacementDraft(placementsToRecord(placements));
    setEditError(null);
  }

  function updateDraftPlacement(memberId: string, placement: Placement | "") {
    setPlacementDraft((current) =>
      current ? { ...current, [memberId]: placement } : current,
    );
  }

  async function savePlacements(eventId: string) {
    if (!placementDraft) return;

    const placements: EventPlacement[] = [];
    const usedMembers = new Set<string>();
    const usedRanks = new Set<Placement>();

    for (const member of members) {
      const placement = placementDraft[member.id];
      if (placement === "") {
        setEditError("Assign a placement to every member.");
        return;
      }

      placements.push({ memberId: member.id, placement });
      usedMembers.add(member.id);
      usedRanks.add(placement);
    }

    if (usedMembers.size !== members.length || usedRanks.size !== members.length) {
      setEditError("Each placement can only be used once.");
      return;
    }

    try {
      await updateEventPlacements(eventId, placements);
      setEditingEventId(null);
      setPlacementDraft(null);
      setEditError(null);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Could not save placements.",
      );
    }
  }

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

      <div className="mb-10">
        <PointsRaceChart
          events={mergedEvents}
          onActiveEventChange={handleActiveEventChange}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mergedEvents.map((event, index) => {
          const previousStandings =
            index > 0 ? mergedEvents[index - 1].standings : null;
          const placements = inferEventPlacements(previousStandings, event) ?? [];
          const eventResults = [...placements].sort(
            (a, b) => a.placement - b.placement,
          );
          const winner = eventResults[0]
            ? memberById[eventResults[0].memberId]
            : null;
          const isActive = activeEventId === event.id;
          const isEditing = editingEventId === event.id;

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
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/85">
                    {formatEventDate(event.date)}
                  </p>
                  <h3 className="mt-1 font-semibold text-stone-50">{event.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => beginEdit(event.id, placements)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-900/70 text-stone-400 hover:border-emerald-400/70 hover:text-emerald-200"
                  aria-label={`Edit ${event.name} placements`}
                  title="Edit placements"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              {winner ? (
                <div className="mt-4 flex items-center gap-3 border-t border-emerald-900/45 pt-4">
                  <MemberAvatar memberId={winner.id} size="sm" showRing />
                  <div>
                    <p className="text-xs text-stone-400">Event winner</p>
                    <p className="font-medium text-stone-50">{winner.name}</p>
                  </div>
                </div>
              ) : null}
              {isEditing && placementDraft ? (
                <div className="mt-4 space-y-3 border-t border-emerald-900/45 pt-4">
                  {members.map((member) => {
                    const taken = usedPlacements(placementDraft, member.id);

                    return (
                      <label
                        key={member.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm"
                      >
                        <span className="font-medium text-stone-200">
                          {member.name}
                        </span>
                        <select
                          value={placementDraft[member.id]}
                          onChange={(changeEvent) =>
                            updateDraftPlacement(
                              member.id,
                              changeEvent.target.value === ""
                                ? ""
                                : (Number(changeEvent.target.value) as Placement),
                            )
                          }
                          className="w-32 rounded border border-emerald-800/70 bg-[#030806] px-2 py-1 text-sm text-stone-50"
                        >
                          <option value="">Placement</option>
                          {PLACEMENTS.map((placement) => {
                            const disabled =
                              taken.has(placement) &&
                              placementDraft[member.id] !== placement;

                            return (
                              <option
                                key={placement}
                                value={placement}
                                disabled={disabled}
                                className={disabled ? "text-stone-600" : ""}
                              >
                                {placementLabel(placement)}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    );
                  })}
                  {editError || syncError ? (
                    <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                      {editError ?? syncError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void savePlacements(event.id)}
                      disabled={isSyncing}
                      className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setPlacementDraft(null);
                        setEditError(null);
                      }}
                      className="rounded-lg border border-emerald-900/70 px-3 py-2 text-sm text-stone-300 hover:bg-emerald-950/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {eventResults.map((result) => (
                    <li
                      key={result.memberId}
                      className="flex justify-between text-sm text-stone-300"
                    >
                      <span>
                        {result.placement}. {memberById[result.memberId].name}
                      </span>
                      <span className="font-mono text-stone-400">
                        {pointsForPlacement(result.placement)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
