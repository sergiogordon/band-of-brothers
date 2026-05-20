"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  createStoredEventResult,
  normalizeStoredEventResult,
  SEASON_RESULTS_STORAGE_KEY,
  sortStoredResults,
} from "@/lib/season-results";
import type { StoredEventResult } from "@/lib/types";

const EMPTY_RESULTS = "[]";
const storageListeners = new Set<() => void>();

function emitStorageChange() {
  for (const listener of storageListeners) {
    listener();
  }
}

function readStoredResults(raw: string): StoredEventResult[] {
  try {
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

function getStorageSnapshot(): string {
  return window.localStorage.getItem(SEASON_RESULTS_STORAGE_KEY) ?? EMPTY_RESULTS;
}

function getServerSnapshot(): string {
  return EMPTY_RESULTS;
}

function subscribeToStorage(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === SEASON_RESULTS_STORAGE_KEY) {
      callback();
    }
  }

  storageListeners.add(callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    storageListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeStoredResults(results: StoredEventResult[]) {
  window.localStorage.setItem(SEASON_RESULTS_STORAGE_KEY, JSON.stringify(results));
  emitStorageChange();
}

export function useStoredSeasonResults() {
  const rawResults = useSyncExternalStore(
    subscribeToStorage,
    getStorageSnapshot,
    getServerSnapshot,
  );
  const results = useMemo(() => readStoredResults(rawResults), [rawResults]);

  const updateResult = useCallback(
    (resultId: string, updater: (result: StoredEventResult) => StoredEventResult) => {
      writeStoredResults(
        sortStoredResults(
          results.map((result) =>
            result.id === resultId ? updater(result) : result,
          ),
        ),
      );
    },
    [results],
  );

  const addResult = useCallback((slotId: string) => {
    if (results.some((result) => result.slotId === slotId)) return;
    writeStoredResults(sortStoredResults([...results, createStoredEventResult(slotId)]));
  }, [results]);

  const removeResult = useCallback((resultId: string) => {
    writeStoredResults(results.filter((result) => result.id !== resultId));
  }, [results]);

  const resetResults = useCallback(() => {
    writeStoredResults([]);
  }, []);

  return useMemo(
    () => ({
      addResult,
      removeResult,
      resetResults,
      results,
      updateResult,
    }),
    [addResult, removeResult, resetResults, results, updateResult],
  );
}
