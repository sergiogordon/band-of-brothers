"use server";

import { revalidatePath } from "next/cache";
import { getSeasonState, saveSeasonState } from "@/lib/db/season";
import {
  buildCompletedDraftSnapshots,
  mergeSeasonEvents,
  normalizeSeasonState,
} from "@/lib/season-state";
import {
  isCompletedResult,
  normalizeStoredEventResult,
  sortStoredResults,
} from "@/lib/season-results";
import { getSortedEvents } from "@/lib/points";
import type { EventSnapshot, SeasonState, StoredEventResult } from "@/lib/types";

function revalidateSeasonPages() {
  revalidatePath("/");
  revalidatePath("/events");
}

export async function fetchSeasonState(): Promise<SeasonState> {
  return getSeasonState();
}

export async function saveDrafts(drafts: StoredEventResult[]): Promise<SeasonState> {
  const current = await getSeasonState();
  const normalizedDrafts = sortStoredResults(
    drafts
      .map((draft) => normalizeStoredEventResult(draft))
      .filter((draft): draft is StoredEventResult => draft !== null),
  );

  const saved = await saveSeasonState({
    ...current,
    drafts: normalizedDrafts,
  });

  revalidateSeasonPages();
  return saved;
}

export async function publishEvent(result: StoredEventResult): Promise<SeasonState> {
  const normalized = normalizeStoredEventResult(result);
  if (!normalized || !isCompletedResult(normalized)) {
    throw new Error("Event must have valid, complete placements before publishing.");
  }

  const current = await getSeasonState();
  const draftSnapshots = buildCompletedDraftSnapshots({
    ...current,
    drafts: [normalized],
  });

  const snapshot = draftSnapshots[draftSnapshots.length - 1];
  if (!snapshot) {
    throw new Error("Could not build event snapshot.");
  }

  const existingIndex = current.events.findIndex((event) => event.id === snapshot.id);
  const events =
    existingIndex >= 0
      ? current.events.map((event, index) => (index === existingIndex ? snapshot : event))
      : [...current.events, snapshot];

  const saved = await saveSeasonState({
    events: getSortedEvents(events),
    drafts: current.drafts.filter((draft) => draft.id !== normalized.id),
  });

  revalidateSeasonPages();
  return saved;
}

export async function deleteEvent(eventId: string): Promise<SeasonState> {
  const current = await getSeasonState();
  const saved = await saveSeasonState({
    ...current,
    events: current.events.filter((event) => event.id !== eventId),
  });

  revalidateSeasonPages();
  return saved;
}

export async function resetDrafts(): Promise<SeasonState> {
  const current = await getSeasonState();
  const saved = await saveSeasonState({
    ...current,
    drafts: [],
  });

  revalidateSeasonPages();
  return saved;
}

export async function saveSeasonStateAction(state: SeasonState): Promise<SeasonState> {
  const saved = await saveSeasonState(normalizeSeasonState(state));
  revalidateSeasonPages();
  return saved;
}

export async function getMergedEvents(): Promise<EventSnapshot[]> {
  const state = await getSeasonState();
  return mergeSeasonEvents(state);
}
