"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchSeasonState,
  resetDrafts as resetDraftsAction,
  saveDrafts as saveDraftsAction,
} from "@/app/actions/season";
import { SEASON_RESULTS_STORAGE_KEY } from "@/lib/season-results";
import {
  getLatestPointsMapFromState,
  getLivePointsMapFromState,
  mergeSeasonEvents,
} from "@/lib/season-state";
import { normalizeStoredEventResult, sortStoredResults } from "@/lib/season-results";
import type { EventSnapshot, SeasonState, StoredEventResult } from "@/lib/types";

type SeasonContextValue = {
  state: SeasonState;
  mergedEvents: EventSnapshot[];
  isSyncing: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
  addResult: (slotId: string) => Promise<void>;
  removeResult: (resultId: string) => Promise<void>;
  resetResults: () => Promise<void>;
  updateResult: (
    resultId: string,
    updater: (result: StoredEventResult) => StoredEventResult,
  ) => Promise<void>;
  getLatestPointsMap: () => Record<string, number>;
  getLivePointsMap: () => Record<string, number>;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

function readLegacyLocalDrafts(): StoredEventResult[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SEASON_RESULTS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortStoredResults(
      parsed
        .map((item) => normalizeStoredEventResult(item))
        .filter((item): item is StoredEventResult => item !== null),
    );
  } catch {
    return [];
  }
}

function clearLegacyLocalDrafts() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SEASON_RESULTS_STORAGE_KEY);
}

type SeasonProviderProps = {
  initialState: SeasonState;
  children: ReactNode;
};

export function SeasonProvider({ initialState, children }: SeasonProviderProps) {
  const [state, setState] = useState(initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const migratedRef = useRef(false);

  const mergedEvents = useMemo(() => mergeSeasonEvents(state), [state]);

  const persistDrafts = useCallback(async (drafts: StoredEventResult[]) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const saved = await saveDraftsAction(drafts);
      setState(saved);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Failed to save season data.");
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

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
    if (migratedRef.current) return;
    migratedRef.current = true;

    const legacyDrafts = readLegacyLocalDrafts();
    if (legacyDrafts.length === 0 || initialState.drafts.length > 0) return;

    void (async () => {
      try {
        await persistDrafts(legacyDrafts);
        clearLegacyLocalDrafts();
      } catch {
        // Keep legacy drafts locally if migration fails.
      }
    })();
  }, [initialState.drafts.length, persistDrafts]);

  useEffect(() => {
    function handleFocus() {
      void refresh();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

  const addResult = useCallback(
    async (slotId: string) => {
      const { createStoredEventResult } = await import("@/lib/season-results");
      if (state.drafts.some((result) => result.slotId === slotId)) return;

      const nextDrafts = sortStoredResults([
        ...state.drafts,
        createStoredEventResult(slotId),
      ]);
      setState((current) => ({ ...current, drafts: nextDrafts }));

      try {
        await persistDrafts(nextDrafts);
      } catch {
        setState(state);
      }
    },
    [persistDrafts, state],
  );

  const removeResult = useCallback(
    async (resultId: string) => {
      const nextDrafts = state.drafts.filter((result) => result.id !== resultId);
      setState((current) => ({ ...current, drafts: nextDrafts }));

      try {
        await persistDrafts(nextDrafts);
      } catch {
        setState(state);
      }
    },
    [persistDrafts, state],
  );

  const resetResults = useCallback(async () => {
    const previous = state;
    setState((current) => ({ ...current, drafts: [] }));

    try {
      const saved = await resetDraftsAction();
      setState(saved);
    } catch (error) {
      setState(previous);
      setSyncError(error instanceof Error ? error.message : "Failed to clear saved results.");
    }
  }, [state]);

  const updateResult = useCallback(
    async (
      resultId: string,
      updater: (result: StoredEventResult) => StoredEventResult,
    ) => {
      const nextDrafts = sortStoredResults(
        state.drafts.map((result) => (result.id === resultId ? updater(result) : result)),
      );
      setState((current) => ({ ...current, drafts: nextDrafts }));

      try {
        await persistDrafts(nextDrafts);
      } catch {
        setState(state);
      }
    },
    [persistDrafts, state],
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
      updateResult,
      getLatestPointsMap: () => getLatestPointsMapFromState(state),
      getLivePointsMap: () => getLivePointsMapFromState(state),
    }),
    [
      addResult,
      isSyncing,
      mergedEvents,
      refresh,
      removeResult,
      resetResults,
      state,
      syncError,
      updateResult,
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
