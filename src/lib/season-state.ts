import { events as seedEvents } from "@/data/events";
import { members } from "@/data/members";
import {
  applyPlacements,
  getLatestEvent,
  getSortedEvents,
  standingsToMap,
} from "@/lib/points";
import {
  isCompletedResult,
  normalizeStoredEventResult,
  placementsRecordToFilled,
  sortStoredResults,
} from "@/lib/season-results";
import type { EventSnapshot, EventType, SeasonState, StandingEntry } from "@/lib/types";

function isValidEventType(value: unknown): value is EventType {
  return value === "golf" || value === "poker" || value === "bowling";
}

export function normalizeEventSnapshot(raw: Partial<EventSnapshot>): EventSnapshot | null {
  if (
    typeof raw.id !== "string" ||
    !raw.id ||
    typeof raw.name !== "string" ||
    !raw.name.trim() ||
    typeof raw.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.date) ||
    !isValidEventType(raw.eventType) ||
    !Array.isArray(raw.standings)
  ) {
    return null;
  }

  const standings: StandingEntry[] = [];
  for (const member of members) {
    const entry = raw.standings.find((standing) => standing.memberId === member.id);
    if (!entry || typeof entry.points !== "number" || entry.points < 0) return null;
    standings.push({ memberId: member.id, points: entry.points });
  }

  return {
    id: raw.id,
    name: raw.name.trim(),
    eventType: raw.eventType,
    venue: typeof raw.venue === "string" ? raw.venue : undefined,
    date: raw.date,
    standings,
  };
}

export function normalizeSeasonState(raw: unknown): SeasonState {
  if (!raw || typeof raw !== "object") {
    return { events: seedEvents, drafts: [] };
  }

  const data = raw as Partial<SeasonState>;
  const events = Array.isArray(data.events)
    ? data.events
        .map((event) => normalizeEventSnapshot(event))
        .filter((event): event is EventSnapshot => event !== null)
    : seedEvents;

  const drafts = Array.isArray(data.drafts)
    ? data.drafts
        .map((draft) => normalizeStoredEventResult(draft))
        .filter((draft): draft is NonNullable<ReturnType<typeof normalizeStoredEventResult>> => draft !== null)
    : [];

  return {
    events: events.length > 0 ? events : seedEvents,
    drafts,
  };
}

export function mergeSeasonEvents(state: SeasonState): EventSnapshot[] {
  return [...getSortedEvents(state.events), ...buildCompletedDraftSnapshots(state)];
}

export function buildCompletedDraftSnapshots(state: SeasonState): EventSnapshot[] {
  let points = standingsToMap(getLatestEvent(state.events).standings);
  const snapshots: EventSnapshot[] = [];

  for (const result of sortStoredResults(state.drafts)) {
    if (!isCompletedResult(result)) continue;

    points = applyPlacements(points, placementsRecordToFilled(result.placements));
    snapshots.push({
      id: result.id,
      name: result.name,
      eventType: result.eventType,
      date: result.date,
      standings: Object.entries(points).map(([memberId, memberPoints]) => ({
        memberId,
        points: memberPoints,
      })),
    });
  }

  return snapshots;
}

export function getLatestPointsMapFromState(state: SeasonState): Record<string, number> {
  const merged = mergeSeasonEvents(state);
  if (merged.length === 0) {
    return standingsToMap(getLatestEvent(state.events).standings);
  }

  const latest = merged[merged.length - 1];
  return Object.fromEntries(
    latest.standings.map((standing) => [standing.memberId, standing.points]),
  );
}

export function getLivePointsMapFromState(state: SeasonState): Record<string, number> {
  let points = standingsToMap(getLatestEvent(state.events).standings);

  for (const result of sortStoredResults(state.drafts)) {
    const assigned = placementsRecordToFilled(result.placements);
    const used = new Set(assigned.map((entry) => entry.placement));
    if (used.size !== assigned.length) continue;

    points = applyPlacements(points, assigned);
  }

  return points;
}

export function emptySeasonState(events: EventSnapshot[] = seedEvents): SeasonState {
  return { events, drafts: [] };
}
