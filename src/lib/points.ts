import { events as seedEvents } from "@/data/events";
import { members } from "@/data/members";
import { pointsForPlacement } from "@/data/scoring";
import type {
  EventPlacement,
  EventSnapshot,
  Placement,
  RankedMember,
  StandingEntry,
} from "@/lib/types";

export function getSortedEvents(eventList: EventSnapshot[] = seedEvents): EventSnapshot[] {
  return [...eventList].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function getLatestEvent(eventList: EventSnapshot[] = seedEvents): EventSnapshot {
  const sorted = getSortedEvents(eventList);
  return sorted[sorted.length - 1];
}

export function standingsToMap(standings: StandingEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const member of members) {
    map[member.id] = 0;
  }
  for (const entry of standings) {
    map[entry.memberId] = entry.points;
  }
  return map;
}

export function getCurrentPointsMap(eventList: EventSnapshot[] = seedEvents): Record<string, number> {
  return standingsToMap(getLatestEvent(eventList).standings);
}

export function rankMembers(pointsMap: Record<string, number>): RankedMember[] {
  const leaderPoints = Math.max(...Object.values(pointsMap));
  const sorted = [...members]
    .map((m) => ({
      memberId: m.id,
      points: pointsMap[m.id] ?? 0,
      gapToLeader: leaderPoints - (pointsMap[m.id] ?? 0),
    }))
    .sort((a, b) => b.points - a.points || a.memberId.localeCompare(b.memberId));

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export function getLeaderAtEvent(event: EventSnapshot): StandingEntry {
  const sorted = [...event.standings].sort((a, b) => b.points - a.points);
  return sorted[0];
}

export function applyPlacements(
  basePoints: Record<string, number>,
  placements: EventPlacement[],
): Record<string, number> {
  const next = { ...basePoints };
  for (const { memberId, placement } of placements) {
    next[memberId] = (next[memberId] ?? 0) + pointsForPlacement(placement);
  }
  return next;
}

export function validatePlacements(placements: EventPlacement[]): string | null {
  if (placements.length !== members.length) {
    return "Assign a placement to every member.";
  }

  const used = new Set<Placement>();
  for (const { placement } of placements) {
    if (used.has(placement)) {
      return "Each placement (1–6) can only be used once per event.";
    }
    used.add(placement);
  }

  return null;
}

export function formatEventDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
