"use client";

import { useState } from "react";
import { Button } from "../design/ui/button";
import type { ChatViewModel, PlannerViewEvent } from "../view-models/view-model";

type ChatViewProps = {
  viewModel: ChatViewModel;
  onEvent: (event: PlannerViewEvent) => void;
};

export function ChatView({ viewModel, onEvent }: ChatViewProps) {
  const [draft, setDraft] = useState("");

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4" aria-label="Chat">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Chat</h2>
        <p data-brief-stage={viewModel.stage}>Stage: {viewModel.stage}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Company
        <select
          className="rounded-md border border-border bg-background px-2 py-2"
          value={viewModel.selectedCompanyId ?? ""}
          onChange={(event) => {
            const companyId = Number(event.target.value);
            if (Number.isInteger(companyId)) {
              onEvent({ type: "companySelected", companyId });
            }
          }}
        >
          {viewModel.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name} ({company.filingPath})
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-3">
        {viewModel.messages.length === 0 ? (
          <p className="text-muted">{viewModel.nextQuestion}</p>
        ) : (
          viewModel.messages.map((message) => (
            <p key={message.id} data-role={message.role}>
              <span className="text-muted">{message.role}: </span>
              {message.text}
            </p>
          ))
        )}
        {questionNeedsItsOwnLine(viewModel) ? <p className="text-muted">{viewModel.nextQuestion}</p> : null}
        {viewModel.errorText ? <p role="alert">{viewModel.errorText}</p> : null}
      </div>
      <dl className="grid gap-2 text-sm">
        {viewModel.briefLines.map((line) => (
          <div key={line.label} className="grid grid-cols-[8rem_1fr] gap-2">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (text === "" || viewModel.busy || !viewModel.ready) {
            return;
          }
          onEvent({ type: "messageSubmitted", text });
          setDraft("");
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Brief
          <textarea
            className="min-h-28 rounded-md border border-border bg-background p-2"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            name="brief"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={viewModel.busy || !viewModel.ready}>
            {viewModel.busy ? "Sending" : "Send"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!viewModel.speechAvailable || viewModel.busy || !viewModel.ready}
            onClick={() => {
              const recognition = openSpeechInput();
              if (!recognition) {
                return;
              }
              recognition.onresult = (speechEvent) => {
                const transcript = transcriptFromSpeechEvent(speechEvent);
                if (transcript !== "") {
                  setDraft(transcript);
                }
              };
              recognition.start();
            }}
          >
            Speak
          </Button>
        </div>
        {viewModel.speechAvailable ? null : (
          <p className="text-sm text-muted">Speech is not available in this browser. Type the brief instead.</p>
        )}
      </form>
    </section>
  );
}

function questionNeedsItsOwnLine(viewModel: ChatViewModel): boolean {
  if (viewModel.messages.length === 0 || viewModel.nextQuestion === "") {
    return false;
  }
  const lastMessage = viewModel.messages[viewModel.messages.length - 1];
  return lastMessage === undefined || !lastMessage.text.includes(viewModel.nextQuestion);
}

type SpeechSession = {
  lang: string;
  onresult: ((event: unknown) => void) | null;
  start: () => void;
};

export function speechInputAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const standard = Reflect.get(window, "SpeechRecognition");
  const prefixed = Reflect.get(window, "webkitSpeechRecognition");
  return typeof standard === "function" || typeof prefixed === "function";
}

function openSpeechInput(): SpeechSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const constructorValue = Reflect.get(window, "SpeechRecognition") ?? Reflect.get(window, "webkitSpeechRecognition");
  if (typeof constructorValue !== "function") {
    return null;
  }
  const session: unknown = Reflect.construct(constructorValue, []);
  if (!isSpeechSession(session)) {
    return null;
  }
  session.lang = "en-US";
  return session;
}

function isSpeechSession(value: unknown): value is SpeechSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const start = Reflect.get(value, "start");
  return typeof start === "function";
}

function transcriptFromSpeechEvent(event: unknown): string {
  if (typeof event !== "object" || event === null) {
    return "";
  }
  const results = Reflect.get(event, "results");
  if (!Array.isArray(results) || results.length === 0) {
    return "";
  }
  const firstResult = results[0];
  if (!Array.isArray(firstResult) || firstResult.length === 0) {
    return "";
  }
  const alternative = firstResult[0];
  if (typeof alternative !== "object" || alternative === null) {
    return "";
  }
  const transcript = Reflect.get(alternative, "transcript");
  return typeof transcript === "string" ? transcript : "";
}
