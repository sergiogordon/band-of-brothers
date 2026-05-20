import { events } from "@/data/events";
import { memberById, members } from "@/data/members";
import { PLACEMENT_POINTS } from "@/data/scoring";
import {
  formatEventDate,
  getSortedEvents,
  rankMembers,
  standingsToMap,
} from "@/lib/points";
import type { EventSnapshot, EventType } from "@/lib/types";

export type RaceRacer = {
  memberId: string;
  points: number;
  rank: number;
  xProgress: number;
  yProgress: number;
};

export type RaceFrame = {
  id: string;
  label: string;
  date?: string;
  dateLabel?: string;
  eventType?: EventType;
  seasonProgress: number;
  racers: RaceRacer[];
};

export type MemberTrailPath = {
  memberId: string;
  d: string;
};

export type TrailSample = {
  xProgress: number;
  yProgress: number;
};

export type InterpolatedRaceState = {
  racers: RaceRacer[];
  activeEventId: string | null;
  activeEventType: EventType | null;
  statusLabel: string;
};

const CHART_COLORS: Record<string, string> = {
  jack: "#f59e0b",
  sergio: "#38bdf8",
  shadi: "#a78bfa",
  sam: "#34d399",
  aaron: "#fb7185",
  nigel: "#94a3b8",
};

const MAX_PLACEMENT_POINTS = PLACEMENT_POINTS[1];
const RACE_HEADROOM = 1.1;

export function getChartColors(): Record<string, string> {
  return CHART_COLORS;
}

export function getRaceMaxPoints(): number {
  const allPoints = events.flatMap((event) =>
    event.standings.map((standing) => standing.points),
  );
  const peak = allPoints.length > 0 ? Math.max(...allPoints) : 0;
  const baseline = MAX_PLACEMENT_POINTS;
  return Math.ceil(Math.max(peak, baseline) * RACE_HEADROOM);
}

export function getPointsProgress(points: number, maxPoints?: number): number {
  const max = maxPoints ?? getRaceMaxPoints();
  if (max <= 0) return 0;
  return Math.min(Math.max(points / max, 0), 1);
}

export function getRaceYAxisTicks(maxPoints: number): number[] {
  if (maxPoints <= 0) return [0];

  const rawStep = maxPoints / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;

  const ticks: number[] = [0];
  for (let value = step; value < maxPoints; value += step) {
    ticks.push(Math.round(value));
  }
  if (ticks[ticks.length - 1] !== maxPoints) {
    ticks.push(maxPoints);
  }
  return ticks;
}

function getSeasonProgress(frameIndex: number, totalFrames: number): number {
  if (totalFrames <= 1) return 0;
  return frameIndex / (totalFrames - 1);
}

function buildRacersFromPointsMap(
  pointsMap: Record<string, number>,
  seasonProgress: number,
): RaceRacer[] {
  const maxPoints = getRaceMaxPoints();
  const ranked = rankMembers(pointsMap);
  return ranked.map((entry) => ({
    memberId: entry.memberId,
    points: entry.points,
    rank: entry.rank,
    xProgress: seasonProgress,
    yProgress: getPointsProgress(entry.points, maxPoints),
  }));
}

function buildStartRacers(seasonProgress: number): RaceRacer[] {
  return members.map((member) => ({
    memberId: member.id,
    points: 0,
    rank: 0,
    xProgress: seasonProgress,
    yProgress: 0,
  }));
}

export function buildPointsRaceFrames(): RaceFrame[] {
  const sortedEvents = getSortedEvents();
  const totalFrames = sortedEvents.length + 1;

  const frames: RaceFrame[] = [
    {
      id: "start",
      label: "Season Start",
      seasonProgress: getSeasonProgress(0, totalFrames),
      racers: buildStartRacers(getSeasonProgress(0, totalFrames)),
    },
  ];

  sortedEvents.forEach((event, index) => {
    const seasonProgress = getSeasonProgress(index + 1, totalFrames);
    frames.push({
      id: event.id,
      label: event.name,
      date: event.date,
      dateLabel: formatShortDate(event.date),
      eventType: event.eventType,
      seasonProgress,
      racers: buildRacersFromPointsMap(
        standingsToMap(event.standings),
        seasonProgress,
      ),
    });
  });

  return frames;
}

export function sampleTrailPoint(xProgress: number, yProgress: number) {
  return {
    x: xProgress * 100,
    y: (1 - yProgress) * 100,
  };
}

export function buildTrailFromSamples(
  samplesByMember: Record<string, TrailSample[]>,
): MemberTrailPath[] {
  return members.map((member) => {
    const samples = samplesByMember[member.id] ?? [];
    if (samples.length === 0) {
      return { memberId: member.id, d: "" };
    }

    const d = samples
      .map((sample, index) => {
        const point = sampleTrailPoint(sample.xProgress, sample.yProgress);
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
      })
      .join(" ");

    return { memberId: member.id, d };
  });
}

export function interpolateRaceAtProgress(
  frames: RaceFrame[],
  seasonProgress: number,
): InterpolatedRaceState {
  const clamped = Math.min(Math.max(seasonProgress, 0), 1);
  const maxPoints = getRaceMaxPoints();

  let prevFrame = frames[0];
  let nextFrame = frames[frames.length - 1];

  for (let i = 0; i < frames.length - 1; i++) {
    if (
      clamped >= frames[i].seasonProgress &&
      clamped <= frames[i + 1].seasonProgress
    ) {
      prevFrame = frames[i];
      nextFrame = frames[i + 1];
      break;
    }
  }

  const span = nextFrame.seasonProgress - prevFrame.seasonProgress;
  const t = span > 0 ? (clamped - prevFrame.seasonProgress) / span : 1;

  const pointsMap: Record<string, number> = {};
  for (const member of members) {
    const prevPoints =
      prevFrame.racers.find((r) => r.memberId === member.id)?.points ?? 0;
    const nextPoints =
      nextFrame.racers.find((r) => r.memberId === member.id)?.points ?? 0;
    pointsMap[member.id] = Math.round(prevPoints + (nextPoints - prevPoints) * t);
  }

  const ranked = rankMembers(pointsMap);
  const racers: RaceRacer[] = ranked.map((entry) => ({
    memberId: entry.memberId,
    points: entry.points,
    rank: entry.rank,
    xProgress: clamped,
    yProgress: getPointsProgress(entry.points, maxPoints),
  }));

  const eventFrames = frames.filter((frame) => frame.id !== "start");
  let activeEventId: string | null = null;
  for (const frame of eventFrames) {
    if (clamped >= frame.seasonProgress) {
      activeEventId = frame.id;
    } else {
      break;
    }
  }

  const activeFrame =
    eventFrames.find((frame) => frame.id === activeEventId) ?? frames[0];

  return {
    racers,
    activeEventId,
    activeEventType: activeFrame.eventType ?? null,
    statusLabel: formatRaceFrameLabel(activeFrame),
  };
}

export function getBuggyBounceOffset(
  memberId: string,
  elapsedMs: number,
  memberIndex: number,
): number {
  const phase = memberIndex * 1.9 + memberId.length * 0.35;
  const freq = 0.002 + (memberIndex % 4) * 0.0004;
  const amplitude = 0.012;
  return Math.sin(elapsedMs * freq + phase) * amplitude;
}

export function getStartFanOffset(
  memberIndex: number,
  totalMembers: number,
): { x: number; y: number } {
  const radius = 10;
  const angle = (memberIndex / totalMembers) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function formatShortDate(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getEventLeaderInfo(event: EventSnapshot) {
  const leader = [...event.standings].sort((a, b) => b.points - a.points)[0];
  const member = memberById[leader.memberId];
  return { leader, member };
}

export function formatRaceFrameLabel(frame: RaceFrame): string {
  if (frame.id === "start") return "Season Start";
  if (frame.date) {
    return `${frame.label} · ${formatEventDate(frame.date)}`;
  }
  return frame.label;
}
