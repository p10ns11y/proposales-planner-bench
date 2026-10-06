"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readHistoryLog, historyStorageKey, upsertHistory, type HistoryEntry } from "../flow/history-log";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../flow/planner-snapshot";
import type { ViewportAction } from "../flow/viewport-turn";
import { captureViewModel, resultsViewModel } from "../view-models/selectors";
import type { PlannerViewEvent } from "../view-models/view-model";
import { CaptureView, speechInputAvailable } from "../views/capture-view";
import { HistoryView } from "../views/history-view";
import { ResultsView } from "../views/results-view";

export function PlannerSession() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null);
  const [historyOverride, setHistoryOverride] = useState<HistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const speechAvailable = useSpeechAvailable();
  const storedHistory = useStoredHistory();
  const history = historyOverride ?? storedHistory;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/session").then(async (response) => {
      const payload: unknown = await response.json();
      if (cancelled || typeof payload !== "object" || payload === null) {
        return;
      }
      const parsed = plannerSnapshotSchema.safeParse(Reflect.get(payload, "snapshot"));
      if (parsed.success) {
        setSnapshot((current) => current ?? parsed.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function sendAction(action: ViewportAction) {
    if (busy) {
      return;
    }
    setBusy(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, snapshot: snapshot ?? undefined }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setErrorText("Something went wrong. Try again.");
        return;
      }
      if (typeof payload !== "object" || payload === null) {
        setErrorText("Something went wrong. Try again.");
        return;
      }
      const parsed = plannerSnapshotSchema.safeParse(Reflect.get(payload, "snapshot"));
      if (!parsed.success) {
        setErrorText("Something went wrong. Try again.");
        return;
      }
      rememberSnapshot(parsed.data);
    } catch {
      setErrorText("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onEvent(event: PlannerViewEvent) {
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
    if (event.type === "briefEdited") {
      void sendAction({ type: "briefEdited", brief: event.brief });
      return;
    }
    if (event.type === "captureSubmitted") {
      void sendAction({ type: "captureSubmitted", text: event.text });
      return;
    }
    if (event.type === "gapAnswered") {
      void sendAction({ type: "gapAnswered", text: event.text });
      return;
    }
    if (event.type === "briefConfirmed") {
      void sendAction(
        event.brief === undefined
          ? { type: "briefConfirmed" }
          : { type: "briefConfirmed", brief: event.brief },
      );
      return;
    }
    if (event.type === "favoritesSubmitted") {
      void sendAction({ type: "favoritesSubmitted", text: event.text });
      return;
    }
    if (event.type === "showMore") {
      void sendAction({ type: "showMore" });
      return;
    }
    if (event.type === "rowOpened") {
      void sendAction({ type: "rowOpened", venueName: event.venueName });
      return;
    }
    if (event.type === "rowClosed") {
      void sendAction({ type: "rowClosed" });
    }
  }

  return (
    <main className="planner-shell" data-brief-stage={snapshot?.stage ?? "collecting"}>
      <div className="planner-layout">
        <div className="planner-panes">
          <CaptureView
            viewModel={captureViewModel({
              snapshot,
              busy,
              errorText,
              speechAvailable,
            })}
            onEvent={onEvent}
            historyControl={
              <HistoryView
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
          <ResultsView viewModel={resultsViewModel(snapshot)} onEvent={onEvent} />
        </div>
      </div>
    </main>
  );
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
