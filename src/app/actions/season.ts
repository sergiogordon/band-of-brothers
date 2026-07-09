"use server";

import { revalidatePath } from "next/cache";
import {
  clearDraftPlacements,
  createDraftEvent,
  deleteAllDraftEvents,
  deleteDraftEvent,
  getSeasonState,
  publishDraftEvent,
  updateDraftEventDetails,
  updateDraftPlacement,
} from "@/lib/db/season";
import { mergeSeasonEvents } from "@/lib/season-state";
import type { EventSnapshot, Placement, SeasonState, StoredEventResult } from "@/lib/types";

function revalidateSeasonPages() {
  revalidatePath("/");
  revalidatePath("/events");
}

async function mutateSeason<T extends SeasonState>(
  operation: () => Promise<T>,
): Promise<T> {
  const saved = await operation();
  revalidateSeasonPages();
  return saved;
}

export async function fetchSeasonState(): Promise<SeasonState> {
  return getSeasonState();
}

export async function createDraft(slotId: string): Promise<SeasonState> {
  return mutateSeason(() => createDraftEvent(slotId));
}

export async function saveDraftDetails(
  result: StoredEventResult,
): Promise<SeasonState> {
  return mutateSeason(() => updateDraftEventDetails(result));
}

export async function saveDraftPlacement(
  resultId: string,
  memberId: string,
  placement: Placement | "",
): Promise<SeasonState> {
  return mutateSeason(() => updateDraftPlacement(resultId, memberId, placement));
}

export async function clearDraftResultPlacements(
  resultId: string,
): Promise<SeasonState> {
  return mutateSeason(() => clearDraftPlacements(resultId));
}

export async function removeDraft(resultId: string): Promise<SeasonState> {
  return mutateSeason(() => deleteDraftEvent(resultId));
}

export async function resetDrafts(): Promise<SeasonState> {
  return mutateSeason(deleteAllDraftEvents);
}

export async function publishEvent(resultId: string): Promise<SeasonState> {
  return mutateSeason(() => publishDraftEvent(resultId));
}

export async function getMergedEvents(): Promise<EventSnapshot[]> {
  const state = await getSeasonState();
  return mergeSeasonEvents(state);
}
