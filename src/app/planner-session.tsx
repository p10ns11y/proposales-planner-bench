"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readHistoryLog, historyStorageKey, upsertHistory, type HistoryEntry } from "../flow/history-log";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../flow/planner-snapshot";
import type { ViewportAction } from "../flow/viewport-turn";
import { shellViewModel } from "../view-models/selectors";
import type { PlannerViewEvent } from "../view-models/view-model";
import { HistoryView } from "../views/history-view";
import { PlannerShell } from "../views/planner-shell";
import { speechInputAvailable } from "../views/speech-input";

export function PlannerSession() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null);
  const [historyOverride, setHistoryOverride] = useState<HistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingKind, setPendingKind] = useState<"read" | "search" | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const loadGeneration = useRef(0);
  const speechAvailable = useSpeechAvailable();
  const storedHistory = useStoredHistory();
  const history = historyOverride ?? storedHistory;

  useEffect(() => {
    const generation = ++loadGeneration.current;
    void loadOpening(generation, false);
  }, []);

  async function loadOpening(generation: number, force: boolean) {
    const response = await fetch("/api/session");
    const payload: unknown = await response.json();
    if (generation !== loadGeneration.current) {
      return;
    }
    const parsed = readTurnSnapshot(payload);
    if (parsed === null) {
      return;
    }
    if (force) {
      setSnapshot(parsed);
      return;
    }
    setSnapshot((current) => current ?? parsed);
  }

  function rememberSnapshot(next: PlannerSnapshot) {
    setSnapshot(next);
    if (next.filing === null && next.offers.length === 0) {
      return;
    }
    setHistoryOverride((current) => {
      const nextHistory = upsertHistory(current ?? storedHistory, next, new Date().toISOString());
      window.localStorage.setItem(historyStorageKey, JSON.stringify(nextHistory));
      return nextHistory;
    });
  }

  async function sendAction(action: ViewportAction, kind: "read" | "search" | null) {
    if (busy) {
      return;
    }
    setPendingKind(kind);
    setBusy(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, snapshot: snapshot ?? undefined }),
      });
      const payload: unknown = await response.json();
      const parsed = readTurnSnapshot(payload);
      if (!response.ok || parsed === null) {
        setErrorText("Couldn't reach Proposales. Your brief is saved.");
        return;
      }
      rememberSnapshot(parsed);
    } catch {
      setErrorText("Couldn't reach Proposales. Your brief is saved.");
    } finally {
      setBusy(false);
      setPendingKind(null);
    }
  }

  function onEvent(event: PlannerViewEvent, pending?: "read" | "search") {
    if (event.type === "historyToggled") {
      setHistoryOpen(event.open);
      return;
    }
    if (event.type === "historyEntryChosen") {
      const entry = history.find((item) => item.id === event.entryId);
      if (entry) {
        setSnapshot(entry.snapshot);
        setHistoryOpen(false);
      }
      return;
    }
    if (event.type === "sessionReset") {
      setSnapshot(null);
      setErrorText(null);
      const generation = ++loadGeneration.current;
      void loadOpening(generation, true);
      return;
    }
    if (event.type === "composerSubmitted") {
      void sendAction({ type: "composerSubmitted", text: event.text }, pending ?? null);
      return;
    }
    if (event.type === "briefConfirmed") {
      void sendAction({ type: "briefConfirmed" }, pending ?? null);
      return;
    }
    if (event.type === "favoritesSubmitted") {
      void sendAction({ type: "favoritesSubmitted", text: event.text }, pending ?? null);
      return;
    }
    if (event.type === "moreEdited") {
      void sendAction({ type: "moreEdited", details: event.details }, null);
      return;
    }
    if (event.type === "showMore") {
      void sendAction({ type: "showMore" }, null);
      return;
    }
    if (event.type === "rowOpened") {
      void sendAction({ type: "rowOpened", venueName: event.venueName }, null);
      return;
    }
    if (event.type === "rowClosed") {
      void sendAction({ type: "rowClosed" }, null);
    }
  }

  return (
    <main className="planner-shell" data-brief-stage={snapshot?.stage ?? "collecting"}>
      <PlannerShell
        viewModel={shellViewModel({
          snapshot,
          busy,
          errorText,
          speechAvailable,
        })}
        onEvent={onEvent}
        pendingKind={pendingKind}
        historyControl={
          <HistoryView
            chatState={`chat:${snapshot?.phase ?? "capture"}`}
            viewModel={{
              open: historyOpen,
              entries: history.map((entry) => ({
                id: entry.id,
                title: entry.title,
                stage: entry.stage,
                savedAt: entry.savedAt,
                venueCount: entry.venueCount,
              })),
            }}
            onEvent={onEvent}
          />
        }
      />
    </main>
  );
}

export function readTurnSnapshot(payload: unknown): PlannerSnapshot | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const parsed = plannerSnapshotSchema.safeParse(Reflect.get(payload, "snapshot"));
  return parsed.success ? parsed.data : null;
}

function useSpeechAvailable(): boolean {
  return useSyncExternalStore(emptySubscribe, speechInputAvailable, () => false);
}

function useStoredHistory(): HistoryEntry[] {
  const raw = useSyncExternalStore(emptySubscribe, readStoredHistory, () => "");
  if (raw === "") {
    return [];
  }
  try {
    const payload: unknown = JSON.parse(raw);
    return readHistoryLog(payload);
  } catch {
    return [];
  }
}

function readStoredHistory(): string {
  return window.localStorage.getItem(historyStorageKey) ?? "";
}

function emptySubscribe(): () => void {
  return () => undefined;
}
