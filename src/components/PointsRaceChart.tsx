"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventIcon } from "@/components/EventIcon";
import { MemberBobblehead } from "@/components/MemberBobblehead";
import { members } from "@/data/members";
import {
  buildFutureRaceMarkers,
  buildPointsRaceFrames,
  buildTrailFromSamples,
  getBuggyBounceOffset,
  getChartColors,
  getPointsProgress,
  getRaceMaxPoints,
  getRaceYAxisTicks,
  getStartFanOffset,
  interpolateRaceAtProgress,
  type RaceAxisMarker,
  type MemberTrailPath,
  type TrailSample,
} from "@/lib/timeline";
import type { EventSnapshot, EventType } from "@/lib/types";

const RACE_LOOP_MS = 18000;
const TRAIL_SAMPLE_MS = 150;

type DisplayRacer = {
  memberId: string;
  points: number;
  xProgress: number;
  yProgress: number;
  bounceOffset: number;
};

type PointsRaceChartProps = {
  events: EventSnapshot[];
  onActiveEventChange?: (eventId: string | null) => void;
};

export function PointsRaceChart({ events, onActiveEventChange }: PointsRaceChartProps) {
  const frames = useMemo(() => buildPointsRaceFrames(events), [events]);
  const futureMarkers = useMemo(() => buildFutureRaceMarkers(events), [events]);
  const colors = getChartColors();
  const maxPoints = useMemo(() => getRaceMaxPoints(events), [events]);
  const yAxisTicks = useMemo(() => getRaceYAxisTicks(maxPoints), [maxPoints]);
  const initialRace = useMemo(
    () => interpolateRaceAtProgress(frames, 0, maxPoints),
    [frames, maxPoints],
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [displayRacers, setDisplayRacers] = useState<DisplayRacer[]>(
    initialRace.racers.map((racer) => ({
      memberId: racer.memberId,
      points: racer.points,
      xProgress: 0,
      yProgress: 0,
      bounceOffset: 0,
    })),
  );
  const [statusLabel, setStatusLabel] = useState(initialRace.statusLabel);
  const [activeEventType, setActiveEventType] = useState<EventType | null>(
    initialRace.activeEventType,
  );
  const [trailPaths, setTrailPaths] = useState<MemberTrailPath[]>(
    buildTrailFromSamples({}),
  );

  const raceProgressRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const loopStartRef = useRef<number | null>(null);
  const trailSamplesRef = useRef<Record<string, TrailSample[]>>({});
  const lastSampleTimeRef = useRef(0);
  const lastActiveEventRef = useRef<string | null>(null);
  const lastProgressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const xAxisLabels = useMemo<RaceAxisMarker[]>(
    () => [
      {
        id: "start",
        label: "Season Start",
        progress: 0,
        eventType: null,
        isFuture: false,
      },
      ...frames
        .filter((frame) => frame.id !== "start")
        .map((frame) => ({
          id: frame.id,
          label: frame.dateLabel ?? frame.label,
          progress: frame.seasonProgress,
          eventType: frame.eventType ?? null,
          isFuture: false,
        })),
      ...futureMarkers,
    ],
    [frames, futureMarkers],
  );

  const resetRace = useCallback(() => {
    raceProgressRef.current = 0;
    elapsedMsRef.current = 0;
    loopStartRef.current = null;
    trailSamplesRef.current = {};
    lastSampleTimeRef.current = 0;
    lastActiveEventRef.current = null;
    lastProgressRef.current = 0;

    const initial = interpolateRaceAtProgress(frames, 0, maxPoints);
    setDisplayRacers(
      initial.racers.map((racer) => ({
        memberId: racer.memberId,
        points: racer.points,
        xProgress: 0,
        yProgress: 0,
        bounceOffset: 0,
      })),
    );
    setStatusLabel(initial.statusLabel);
    setActiveEventType(initial.activeEventType);
    onActiveEventChange?.(null);
    setTrailPaths(buildTrailFromSamples({}));
  }, [frames, maxPoints, onActiveEventChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (loopStartRef.current === null) {
        loopStartRef.current = timestamp - elapsedMsRef.current;
      }

      elapsedMsRef.current = timestamp - loopStartRef.current;
      raceProgressRef.current =
        (elapsedMsRef.current % RACE_LOOP_MS) / RACE_LOOP_MS;

      if (raceProgressRef.current < lastProgressRef.current) {
        trailSamplesRef.current = {};
        setTrailPaths(buildTrailFromSamples({}));
      }
      lastProgressRef.current = raceProgressRef.current;

      const interpolated = interpolateRaceAtProgress(
        frames,
        raceProgressRef.current,
        maxPoints,
      );

      if (interpolated.activeEventId !== lastActiveEventRef.current) {
        lastActiveEventRef.current = interpolated.activeEventId;
        onActiveEventChange?.(interpolated.activeEventId);
      }

      setStatusLabel(interpolated.statusLabel);
      setActiveEventType(interpolated.activeEventType);

      const nextDisplay: DisplayRacer[] = interpolated.racers.map(
        (racer, memberIndex) => {
          const bounce = reducedMotion
            ? 0
            : getBuggyBounceOffset(racer.memberId, elapsedMsRef.current, memberIndex);
          const yProgress = Math.min(
            Math.max(racer.yProgress + bounce, 0),
            1,
          );

          return {
            memberId: racer.memberId,
            points: racer.points,
            xProgress: racer.xProgress,
            yProgress,
            bounceOffset: bounce,
          };
        },
      );

      setDisplayRacers(nextDisplay);

      if (elapsedMsRef.current - lastSampleTimeRef.current >= TRAIL_SAMPLE_MS) {
        lastSampleTimeRef.current = elapsedMsRef.current;

        for (const racer of interpolated.racers) {
          if (!trailSamplesRef.current[racer.memberId]) {
            trailSamplesRef.current[racer.memberId] = [];
          }
          trailSamplesRef.current[racer.memberId].push({
            xProgress: racer.xProgress,
            yProgress: racer.yProgress,
          });
        }

        setTrailPaths(buildTrailFromSamples(trailSamplesRef.current));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      loopStartRef.current = null;
    };
  }, [frames, isPlaying, maxPoints, onActiveEventChange, reducedMotion]);

  const handleRestart = useCallback(() => {
    resetRace();
    setIsPlaying(true);
  }, [resetRace]);

  const racerByMember = useMemo(
    () => Object.fromEntries(displayRacers.map((r) => [r.memberId, r])),
    [displayRacers],
  );

  return (
    <div className="rounded-xl border border-emerald-900/45 bg-[#07100d]/80 p-3 shadow-inner shadow-stone-950/70 sm:rounded-2xl sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-300/75">
            Season climb
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Points (up) · Time (right) · 0–{maxPoints} pts
          </p>
        </div>
        <p
          aria-live="polite"
          className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-200/90 sm:justify-end"
        >
          {activeEventType && (
            <EventIcon
              type={activeEventType}
              size="sm"
              className="text-emerald-300"
            />
          )}
          <span className="min-w-0">
            {isPlaying ? statusLabel : `Paused · ${statusLabel}`}
          </span>
        </p>
      </div>

      <div className="flex min-w-0 gap-3">
        <div className="relative hidden w-12 shrink-0 sm:block">
          {yAxisTicks.map((tick) => {
            const progress = getPointsProgress(tick, maxPoints);
            return (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 font-mono text-xs text-stone-500"
                style={{ bottom: `${progress * 100}%` }}
              >
                {tick}
              </span>
            );
          })}
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden px-1 sm:overflow-visible sm:px-0">
          <div className="relative h-[26rem] overflow-visible pb-6 pt-12 sm:h-[38rem] sm:pt-14">
            <div
              className="absolute right-1 top-2 z-20 flex max-w-[8.5rem] items-center gap-1.5 rounded-full border border-[#d6b35a]/45 bg-[#030806]/90 px-2 py-1 shadow-lg shadow-emerald-950/60 backdrop-blur-sm sm:right-2 sm:max-w-none sm:px-2.5"
              title="Season winner prize"
            >
              <svg
                className="h-4 w-4 shrink-0 text-[#d6b35a]"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L6 21l2.3-7-6-4.6h7.6L12 2z" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#d6b35a] sm:text-xs">
                Free trip to Vegas
              </span>
            </div>

            {yAxisTicks.map((tick) => {
              const progress = getPointsProgress(tick, maxPoints);
              return (
                <div
                  key={`grid-${tick}`}
                  className="pointer-events-none absolute inset-x-0 border-t border-emerald-950/80"
                  style={{ bottom: `${progress * 100}%` }}
                  aria-hidden="true"
                />
              );
            })}

            {xAxisLabels
              .filter((label) => label.progress > 0)
              .map((label) => (
                <div
                  key={`time-${label.id}`}
                  className={`pointer-events-none absolute bottom-0 top-0 border-l border-dashed ${
                    label.isFuture
                      ? "border-emerald-900/25"
                      : "border-emerald-900/45"
                  }`}
                  style={{ left: `${label.progress * 100}%` }}
                  aria-hidden="true"
                />
              ))}

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-emerald-800/70"
              aria-hidden="true"
            />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {trailPaths.map((trail) => (
                <path
                  key={trail.memberId}
                  d={trail.d}
                  fill="none"
                  stroke={colors[trail.memberId] ?? "#cbd5e1"}
                  strokeWidth={2.5}
                  strokeOpacity={0.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {members.map((member, memberIndex) => {
              const racer = racerByMember[member.id];
              const points = racer?.points ?? 0;
              const xPercent = (racer?.xProgress ?? 0) * 100;
              const yPercent = racer?.yProgress ?? 0;
              const color = colors[member.id] ?? "#cbd5e1";
              const fanOffset =
                points <= 0 && (racer?.xProgress ?? 0) < 0.02
                  ? getStartFanOffset(memberIndex, members.length)
                  : { x: 0, y: 0 };

              return (
                <div
                  key={member.id}
                  className="absolute z-10 will-change-[left,bottom]"
                  style={{
                    left: `clamp(2.25rem, calc(${xPercent}% + ${fanOffset.x}px), calc(100% - 2.25rem))`,
                    bottom: `calc(${yPercent * 100}% + ${fanOffset.y}px)`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="flex items-end gap-1 sm:gap-2">
                    <div className="flex flex-col items-center">
                      <span className="mb-0.5 hidden max-w-12 truncate text-center text-[10px] font-medium text-stone-300 sm:block sm:max-w-none sm:text-xs">
                        {member.name}
                      </span>
                      <div className="origin-bottom scale-75 sm:scale-100">
                        <MemberBobblehead
                          memberId={member.id}
                          accentColor={color}
                          tiltDeg={
                            reducedMotion ? 0 : (racer?.bounceOffset ?? 0) * 120
                          }
                        />
                      </div>
                    </div>
                    <span className="mb-2 whitespace-nowrap rounded-md border border-emerald-800/70 bg-[#030806] px-1.5 py-0.5 font-mono text-xs font-semibold text-stone-50 shadow-md sm:px-2 sm:text-sm">
                      {points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mt-3 h-9 px-1 sm:h-14">
            {xAxisLabels.map((label) => (
              <div
                key={label.id}
                className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
                style={{ left: `${label.progress * 100}%` }}
                title={label.label}
              >
                {label.eventType ? (
                  <EventIcon
                    type={label.eventType}
                    size="sm"
                    className="text-emerald-300/80"
                  />
                ) : label.isFuture ? (
                  <span className="mt-2 h-1.5 w-1.5 rounded-full border border-emerald-500/30 bg-emerald-950" />
                ) : null}
                <span
                  className={`hidden text-xs sm:inline ${
                    label.isFuture ? "text-stone-600" : "text-stone-500"
                  }`}
                >
                  {label.label}
                </span>
                {label.isFuture && label.progress === 1 && (
                  <span className="hidden text-[10px] uppercase tracking-wider text-[#d6b35a]/80 sm:inline">
                    Vegas
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPlaying((prev) => !prev)}
          className="rounded-lg border border-emerald-700/60 bg-emerald-950/70 px-4 py-2 text-sm font-medium text-stone-50 transition hover:border-emerald-300/60 hover:bg-emerald-900/70"
          aria-pressed={isPlaying}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg border border-emerald-900/70 bg-[#07100d] px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-stone-500 hover:bg-emerald-950/70 hover:text-stone-50"
        >
          Restart
        </button>
        <span className="text-xs text-stone-500">
          {isPlaying ? "Racing…" : "Paused"}
        </span>
      </div>
    </div>
  );
}
