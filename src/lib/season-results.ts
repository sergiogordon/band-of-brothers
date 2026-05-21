import { futureEventSlots } from "@/data/events";
import { members } from "@/data/members";
import { applyPlacements, getCurrentPointsMap, getSortedEvents } from "@/lib/points";
import type {
  EventPlacement,
  EventSnapshot,
  EventType,
  FutureEventSlot,
  Placement,
  StoredEventResult,
} from "@/lib/types";

export const SEASON_RESULTS_STORAGE_KEY = "band-of-brothers-season-results-v1";

const DEFAULT_EVENT_TYPE: EventType = "poker";

export function emptyPlacementMap(): Record<string, Placement | ""> {
  return Object.fromEntries(members.map((member) => [member.id, ""]));
}

export function getFutureSlot(slotId: string): FutureEventSlot | undefined {
  return futureEventSlots.find((slot) => slot.id === slotId);
}

export function defaultEventDate(slot: FutureEventSlot): string {
  return `${slot.year}-${String(slot.month).padStart(2, "0")}-01`;
}

export function createStoredEventResult(slotId: string): StoredEventResult {
  const slot = getFutureSlot(slotId) ?? futureEventSlots[0];

  return {
    id: `${slot.id}-result`,
    slotId: slot.id,
    name: `${slot.label} Event`,
    eventType: DEFAULT_EVENT_TYPE,
    date: defaultEventDate(slot),
    placements: emptyPlacementMap(),
  };
}

export function normalizeStoredEventResult(
  raw: Partial<StoredEventResult>,
): StoredEventResult | null {
  if (!raw.slotId || !getFutureSlot(raw.slotId)) return null;

  const base = createStoredEventResult(raw.slotId);
  const placements = emptyPlacementMap();
  const rawPlacements = raw.placements ?? {};

  for (const member of members) {
    const placement = rawPlacements[member.id];
    placements[member.id] =
      placement === 1 ||
      placement === 2 ||
      placement === 3 ||
      placement === 4 ||
      placement === 5 ||
      placement === 6
        ? placement
        : "";
  }

  return {
    ...base,
    id: typeof raw.id === "string" && raw.id ? raw.id : base.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : base.name,
    eventType:
      raw.eventType === "golf" ||
      raw.eventType === "poker" ||
      raw.eventType === "bowling"
        ? raw.eventType
        : base.eventType,
    date:
      typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
        ? raw.date
        : base.date,
    placements,
  };
}

export function placementsRecordToFilled(
  placements: Record<string, Placement | "">,
): EventPlacement[] {
  const filled: EventPlacement[] = [];

  for (const member of members) {
    const placement = placements[member.id];
    if (placement !== "") {
      filled.push({ memberId: member.id, placement });
    }
  }

  return filled;
}

export function getPlacementStatus(
  placements: Record<string, Placement | "">,
): { complete: boolean; duplicate: boolean } {
  const assigned = placementsRecordToFilled(placements);
  const used = new Set<Placement>();
  let duplicate = false;

  for (const entry of assigned) {
    if (used.has(entry.placement)) duplicate = true;
    used.add(entry.placement);
  }

  return {
    complete: assigned.length === members.length && used.size === members.length,
    duplicate,
  };
}

export function isCompletedResult(result: StoredEventResult): boolean {
  const status = getPlacementStatus(result.placements);
  return status.complete && !status.duplicate;
}

export function sortStoredResults(
  results: StoredEventResult[],
): StoredEventResult[] {
  return [...results].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.slotId.localeCompare(b.slotId);
  });
}

export function buildCompletedEventSnapshots(
  storedResults: StoredEventResult[],
  baseEvents?: EventSnapshot[],
): EventSnapshot[] {
  let points = getCurrentPointsMap(baseEvents);
  const snapshots: EventSnapshot[] = [];

  for (const result of sortStoredResults(storedResults)) {
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

export function getEventsWithStoredResults(
  storedResults: StoredEventResult[],
  baseEvents?: EventSnapshot[],
): EventSnapshot[] {
  const events = baseEvents ?? getSortedEvents();
  return [...events, ...buildCompletedEventSnapshots(storedResults, events)];
}

export function getLatestPointsMapWithStoredResults(
  storedResults: StoredEventResult[],
  baseEvents?: EventSnapshot[],
): Record<string, number> {
  const completed = buildCompletedEventSnapshots(storedResults, baseEvents);
  if (completed.length === 0) return getCurrentPointsMap(baseEvents);

  return Object.fromEntries(
    completed[completed.length - 1].standings.map((standing) => [
      standing.memberId,
      standing.points,
    ]),
  );
}

export function getLivePointsMap(
  storedResults: StoredEventResult[],
  baseEvents?: EventSnapshot[],
): Record<string, number> {
  let points = getCurrentPointsMap(baseEvents);

  for (const result of sortStoredResults(storedResults)) {
    const status = getPlacementStatus(result.placements);
    if (status.duplicate) continue;

    points = applyPlacements(points, placementsRecordToFilled(result.placements));
  }

  return points;
}
