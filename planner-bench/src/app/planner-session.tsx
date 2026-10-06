"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { readHistoryLog, historyStorageKey, upsertHistory, type HistoryEntry } from "../flow/history-log";
import { plannerSnapshotSchema, type PlannerSnapshot } from "../flow/planner-snapshot";
import { chatViewModel, resultsViewModel } from "../view-models/selectors";
import type { PlannerViewEvent } from "../view-models/view-model";
import { ChatView, speechInputAvailable } from "../views/chat-view";
import { HistoryView } from "../views/history-view";
import { ResultsView } from "../views/results-view";

type PlannerUIMessage = UIMessage<unknown, { snapshot: PlannerSnapshot }>;

export function PlannerSession() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot | null>(null);
  const [historyOverride, setHistoryOverride] = useState<HistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const speechAvailable = useSpeechAvailable();
  const storedHistory = useStoredHistory();
  const history = historyOverride ?? storedHistory;

  const transport = useMemo(
    () => new DefaultChatTransport<PlannerUIMessage>({ api: "/api/chat" }),
    [],
  );

  const chat = useChat<PlannerUIMessage>({
    transport,
    onData: (part) => {
      if (part.type !== "data-snapshot") {
        return;
      }
      const parsed = plannerSnapshotSchema.safeParse(part.data);
      if (parsed.success) {
        rememberSnapshot(parsed.data);
      }
    },
  });

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

  function onEvent(event: PlannerViewEvent) {
    if (event.type === "messageSubmitted") {
      void chat.sendMessage(
        { text: event.text },
        { body: { snapshot: snapshot ?? undefined } },
      );
      return;
    }
    if (event.type === "companySelected") {
      setSnapshot((current) =>
        current === null ? current : { ...current, selectedCompanyId: event.companyId },
      );
      return;
    }
    if (event.type === "historyToggled") {
      setHistoryOpen(event.open);
      return;
    }
    const entry = history.find((item) => item.id === event.entryId);
    if (entry) {
      setSnapshot(entry.snapshot);
      setHistoryOpen(false);
    }
  }

  const messages = chat.messages.map((message) => ({
    id: message.id,
    role: message.role,
    text: textFromParts(message.parts),
  }));

  return (
    <main className="min-h-dvh bg-background text-foreground" data-brief-stage={snapshot?.stage ?? "collecting"}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl">Planner bench</h1>
            <p className="text-sm text-muted">One brief, the offers you received, one grid.</p>
          </div>
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
        </header>
        <ChatView
          viewModel={chatViewModel({
            snapshot,
            messages,
            busy: chat.status === "submitted" || chat.status === "streaming",
            errorText: chat.error === undefined ? null : chat.error.message,
            speechAvailable,
          })}
          onEvent={onEvent}
        />
        <ResultsView viewModel={resultsViewModel(snapshot)} />
      </div>
    </main>
  );
}

function textFromParts(parts: PlannerUIMessage["parts"]): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      chunks.push(part.text);
    }
  }
  return chunks.join("");
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
