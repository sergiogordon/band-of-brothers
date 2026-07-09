"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearDraftResultPlacements,
  createDraft,
  fetchSeasonState,
  publishEvent as publishEventAction,
  removeDraft,
  resetDrafts as resetDraftsAction,
  saveDraftDetails,
  saveDraftPlacement,
  savePublishedEventPlacements,
} from "@/app/actions/season";
import {
  getLatestPointsMapFromState,
  getLivePointsMapFromState,
  mergeSeasonEvents,
} from "@/lib/season-state";
import type {
  EventPlacement,
  EventSnapshot,
  Placement,
  SeasonState,
  StoredEventResult,
} from "@/lib/types";

type SeasonContextValue = {
  state: SeasonState;
  mergedEvents: EventSnapshot[];
  isSyncing: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
  addResult: (slotId: string) => Promise<void>;
  removeResult: (resultId: string) => Promise<void>;
  resetResults: () => Promise<void>;
  publishResult: (resultId: string) => Promise<void>;
  updateEventPlacements: (
    eventId: string,
    placements: EventPlacement[],
  ) => Promise<void>;
  updateResult: (
    resultId: string,
    updater: (result: StoredEventResult) => StoredEventResult,
  ) => Promise<void>;
  getLatestPointsMap: () => Record<string, number>;
  getLivePointsMap: () => Record<string, number>;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

function getChangedPlacements(
  previous: StoredEventResult,
  next: StoredEventResult,
): Array<{ memberId: string; placement: Placement | "" }> {
  const memberIds = new Set([
    ...Object.keys(previous.placements),
    ...Object.keys(next.placements),
  ]);
  const changed: Array<{ memberId: string; placement: Placement | "" }> = [];

  for (const memberId of memberIds) {
    const previousPlacement = previous.placements[memberId] ?? "";
    const nextPlacement = next.placements[memberId] ?? "";

    if (previousPlacement !== nextPlacement) {
      changed.push({ memberId, placement: nextPlacement });
    }
  }

  return changed;
}

function detailsChanged(previous: StoredEventResult, next: StoredEventResult): boolean {
  return (
    previous.id !== next.id ||
    previous.slotId !== next.slotId ||
    previous.name !== next.name ||
    previous.eventType !== next.eventType ||
    previous.date !== next.date
  );
}

type SeasonProviderProps = {
  initialState: SeasonState;
  children: ReactNode;
};

export function SeasonProvider({ initialState, children }: SeasonProviderProps) {
  const [state, setState] = useState(initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const mergedEvents = useMemo(() => mergeSeasonEvents(state), [state]);

  const runMutation = useCallback(
    async (operation: () => Promise<SeasonState>) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const saved = await operation();
        setState(saved);
        return saved;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save season data.";
        setSyncError(message);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const next = await fetchSeasonState();
      setState(next);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to refresh season data.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    function handleFocus() {
      void refresh();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  const addResult = useCallback(
    async (slotId: string) => {
      if (state.drafts.some((result) => result.slotId === slotId)) return;

      await runMutation(() => createDraft(slotId));
    },
    [runMutation, state.drafts],
  );

  const removeResult = useCallback(
    async (resultId: string) => {
      const previous = state;
      setState((current) => ({
        ...current,
        drafts: current.drafts.filter((result) => result.id !== resultId),
      }));

      try {
        await runMutation(() => removeDraft(resultId));
      } catch {
        setState(previous);
      }
    },
    [runMutation, state],
  );

  const resetResults = useCallback(async () => {
    const previous = state;
    setState((current) => ({ ...current, drafts: [] }));

    try {
      await runMutation(() => resetDraftsAction());
    } catch {
      setState(previous);
    }
  }, [runMutation, state]);

  const publishResult = useCallback(
    async (resultId: string) => {
      await runMutation(() => publishEventAction(resultId));
    },
    [runMutation],
  );

  const updateEventPlacements = useCallback(
    async (eventId: string, placements: EventPlacement[]) => {
      await runMutation(() => savePublishedEventPlacements(eventId, placements));
    },
    [runMutation],
  );

  const updateResult = useCallback(
    async (
      resultId: string,
      updater: (result: StoredEventResult) => StoredEventResult,
    ) => {
      const previousState = state;
      const previousResult = state.drafts.find((result) => result.id === resultId);
      if (!previousResult) return;

      const nextResult = updater(previousResult);
      const nextDrafts = state.drafts.map((result) =>
        result.id === resultId ? nextResult : result,
      );
      setState((current) => ({ ...current, drafts: nextDrafts }));

      try {
        const placementChanges = getChangedPlacements(previousResult, nextResult);
        const changedDetails = detailsChanged(previousResult, nextResult);

        await runMutation(async () => {
          let saved: SeasonState | null = null;

          if (changedDetails) {
            saved = await saveDraftDetails(nextResult);
          }

          if (
            placementChanges.length > 0 &&
            placementChanges.every((change) => change.placement === "")
          ) {
            saved = await clearDraftResultPlacements(nextResult.id);
          } else {
            for (const change of placementChanges) {
              saved = await saveDraftPlacement(
                nextResult.id,
                change.memberId,
                change.placement,
              );
            }
          }

          return saved ?? fetchSeasonState();
        });
      } catch {
        setState(previousState);
      }
    },
    [runMutation, state],
  );

  const value = useMemo<SeasonContextValue>(
    () => ({
      state,
      mergedEvents,
      isSyncing,
      syncError,
      refresh,
      addResult,
      removeResult,
      resetResults,
      publishResult,
      updateEventPlacements,
      updateResult,
      getLatestPointsMap: () => getLatestPointsMapFromState(state),
      getLivePointsMap: () => getLivePointsMapFromState(state),
    }),
    [
      addResult,
      isSyncing,
      mergedEvents,
      publishResult,
      refresh,
      removeResult,
      resetResults,
      state,
      syncError,
      updateResult,
      updateEventPlacements,
    ],
  );

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeasonState(): SeasonContextValue {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error("useSeasonState must be used within SeasonProvider");
  }
  return context;
}
