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

function assertAdminKey(adminKey: string) {
  const expected = process.env.RESULTS_ADMIN_KEY;

  if (!expected) {
    throw new Error("Results admin key is not configured on the server.");
  }

  if (adminKey !== expected) {
    throw new Error("Invalid results admin key.");
  }
}

async function mutateSeason<T extends SeasonState>(
  adminKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  assertAdminKey(adminKey);
  const saved = await operation();
  revalidateSeasonPages();
  return saved;
}

export async function fetchSeasonState(): Promise<SeasonState> {
  return getSeasonState();
}

export async function createDraft(
  slotId: string,
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () => createDraftEvent(slotId));
}

export async function saveDraftDetails(
  result: StoredEventResult,
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () => updateDraftEventDetails(result));
}

export async function saveDraftPlacement(
  resultId: string,
  memberId: string,
  placement: Placement | "",
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () =>
    updateDraftPlacement(resultId, memberId, placement),
  );
}

export async function clearDraftResultPlacements(
  resultId: string,
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () => clearDraftPlacements(resultId));
}

export async function removeDraft(
  resultId: string,
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () => deleteDraftEvent(resultId));
}

export async function resetDrafts(adminKey: string): Promise<SeasonState> {
  return mutateSeason(adminKey, deleteAllDraftEvents);
}

export async function publishEvent(
  resultId: string,
  adminKey: string,
): Promise<SeasonState> {
  return mutateSeason(adminKey, () => publishDraftEvent(resultId));
}

export async function getMergedEvents(): Promise<EventSnapshot[]> {
  const state = await getSeasonState();
  return mergeSeasonEvents(state);
}
