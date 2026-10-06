"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../design/ui/button";
import type { CaptureViewModel, PlannerViewEvent } from "../view-models/view-model";

type CaptureViewProps = {
  viewModel: CaptureViewModel;
  onEvent: (event: PlannerViewEvent) => void;
  historyControl: ReactNode;
};

const readyQuestion = "Does this brief look right?";

export function CaptureView({ viewModel, onEvent, historyControl }: CaptureViewProps) {
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState("");
  const [correction, setCorrection] = useState("");
  const [favoriteDraft, setFavoriteDraft] = useState("");
  const sentence = heardSentence(viewModel.briefLines);
  const askingGap = viewModel.phase === "confirm" && viewModel.nextQuestion !== readyQuestion;
  const readyToConfirm = viewModel.phase === "confirm" && !askingGap;
  const ask = askFor(viewModel, askingGap);
  const fieldId = fieldIdFor(viewModel.phase, readyToConfirm);

  return (
    <section className="planner-capture" aria-label="Brief" data-phase={viewModel.phase}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 id="planner-ask" className="text-2xl leading-tight text-balance">
          {fieldId === "correction" || fieldId === "" ? (
            ask
          ) : (
            <label htmlFor={fieldId}>{ask}</label>
          )}
        </h1>
        {historyControl}
      </div>
      <div className="planner-step">
        {viewModel.phase === "capture" ? (
          <form
            className="flex min-h-0 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (text === "" || viewModel.busy || !viewModel.ready) {
                return;
              }
              onEvent({ type: "captureSubmitted", text });
              setDraft("");
            }}
          >
            <textarea
              id="capture"
              className="planner-field min-h-24 w-full resize-none border border-border bg-card px-3 py-3 text-base leading-relaxed outline-none"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              name="capture"
              enterKeyHint="next"
              placeholder="I need a place in Stockholm for 40 people on 12 November 2026, with dinner and a meeting room."
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-12 px-4" disabled={viewModel.busy || !viewModel.ready}>
                {viewModel.busy ? "Working" : "Continue"}
              </Button>
              <SpeakButton
                disabled={!viewModel.speechAvailable || viewModel.busy || !viewModel.ready}
                onTranscript={(transcript) => setDraft(transcript)}
              />
            </div>
          </form>
        ) : null}

        {askingGap ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const text = answer.trim();
              if (text === "" || viewModel.busy) {
                return;
              }
              onEvent({ type: "gapAnswered", text });
              setAnswer("");
            }}
          >
            {sentence === "" ? null : <p className="text-base leading-snug text-muted">{sentence}</p>}
            <input
              id="answer"
              className="planner-field min-h-12 w-full border border-border bg-card px-3 text-base outline-none"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              name="answer"
              required
              enterKeyHint="next"
              {...inputHints(viewModel.nextQuestion)}
            />
            <Button type="submit" className="min-h-12 self-start px-4" disabled={viewModel.busy}>
              {viewModel.busy ? "Working" : "Continue"}
            </Button>
          </form>
        ) : null}

        {readyToConfirm ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (viewModel.busy) {
                return;
              }
              const text = correction.trim();
              if (text === "") {
                onEvent({ type: "briefConfirmed" });
                return;
              }
              onEvent({ type: "gapAnswered", text });
              setCorrection("");
            }}
          >
            {sentence === "" ? null : <p className="text-lg leading-snug">{sentence}</p>}
            <label htmlFor="correction" className="flex flex-col gap-2 text-sm">
              <span className="text-muted">Change a detail</span>
              <input
                id="correction"
                className="planner-field min-h-12 w-full border border-border bg-card px-3 text-base outline-none"
                value={correction}
                onChange={(event) => setCorrection(event.target.value)}
                name="correction"
                enterKeyHint="done"
              />
            </label>
            <Button type="submit" className="min-h-12 self-start px-4" disabled={viewModel.busy}>
              {viewModel.busy ? "Working" : correction.trim() === "" ? "Yes" : "Update"}
            </Button>
          </form>
        ) : null}

        {viewModel.phase === "favorites" ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (viewModel.busy) {
                return;
              }
              onEvent({ type: "favoritesSubmitted", text: favoriteDraft });
              setFavoriteDraft("");
            }}
          >
            <input
              id="favorites"
              className="planner-field min-h-12 w-full border border-border bg-card px-3 text-base outline-none"
              value={favoriteDraft}
              onChange={(event) => setFavoriteDraft(event.target.value)}
              name="favorites"
              enterKeyHint="done"
              placeholder="Harbour House, Ridge Hall"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-12 px-4" disabled={viewModel.busy}>
                {viewModel.busy ? "Finding venues" : "Find venues"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-12 px-4"
                disabled={viewModel.busy}
                onClick={() => onEvent({ type: "favoritesSubmitted", text: "" })}
              >
                Skip
              </Button>
            </div>
          </form>
        ) : null}

        {viewModel.phase === "results" ? (
          <p className="text-lg leading-snug">{sentence}</p>
        ) : null}

        {viewModel.errorText ? (
          <p role="alert" className="text-sm">
            {viewModel.errorText}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function askFor(viewModel: CaptureViewModel, askingGap: boolean): string {
  if (viewModel.phase === "capture") {
    return "What do you need?";
  }
  if (askingGap) {
    return viewModel.nextQuestion;
  }
  if (viewModel.phase === "confirm") {
    return "Is this it?";
  }
  if (viewModel.phase === "favorites") {
    return viewModel.nextQuestion;
  }
  return "The brief";
}

function fieldIdFor(phase: CaptureViewModel["phase"], readyToConfirm: boolean): string {
  if (phase === "capture") {
    return "capture";
  }
  if (phase === "confirm" && !readyToConfirm) {
    return "answer";
  }
  if (phase === "favorites") {
    return "favorites";
  }
  return "";
}

function inputHints(question: string): { type?: "email" | "text"; autoComplete?: string; inputMode?: "email" | "numeric" | "text" } {
  if (question.toLowerCase().includes("email")) {
    return { type: "email", autoComplete: "email", inputMode: "email" };
  }
  if (question.startsWith("How many")) {
    return { type: "text", inputMode: "numeric" };
  }
  return { type: "text", inputMode: "text" };
}

function holdDate(value: string): string {
  return value.replaceAll("-", "\u2011");
}

function heardSentence(lines: CaptureViewModel["briefLines"]): string {
  const value = (label: string) => lines.find((line) => line.label === label)?.value;
  const event = value("Event");
  const city = value("City");
  const start = value("Start");
  const end = value("End");
  const attendees = value("Attendees");
  const meetingRooms = value("Meeting rooms");
  const rooms = value("Rooms");
  const food = value("Food");
  const organisation = value("Organisation");
  const email = value("Email");
  const language = value("Language");
  const parts: string[] = [];
  if (event !== undefined) {
    parts.push(event);
  }
  if (organisation !== undefined) {
    parts.push(`for ${organisation}`);
  }
  if (city !== undefined) {
    parts.push(`in ${city}`);
  }
  if (attendees !== undefined) {
    parts.push(`for ${attendees} people`);
  }
  if (start !== undefined && end !== undefined && start !== end) {
    parts.push(`${holdDate(start)} to ${holdDate(end)}`);
  } else if (start !== undefined) {
    parts.push(`on ${holdDate(start)}`);
  } else if (end !== undefined) {
    parts.push(`until ${holdDate(end)}`);
  }
  if (food === "yes") {
    parts.push("with food");
  }
  if (food === "no") {
    parts.push("without food");
  }
  if (meetingRooms !== undefined) {
    parts.push(`${meetingRooms} meeting ${meetingRooms === "1" ? "room" : "rooms"}`);
  }
  if (rooms !== undefined) {
    parts.push(`${rooms} overnight ${rooms === "1" ? "room" : "rooms"}`);
  }
  if (language !== undefined) {
    parts.push(`in ${language}`);
  }
  if (email !== undefined) {
    parts.push(`replies to ${email}`);
  }
  if (parts.length === 0) {
    return "";
  }
  const sentence = parts.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

function SpeakButton({
  disabled,
  onTranscript,
}: {
  disabled: boolean;
  onTranscript: (transcript: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-12 px-4"
      disabled={disabled}
      onClick={() => {
        const recognition = openSpeechInput();
        if (!recognition) {
          return;
        }
        recognition.onresult = (speechEvent) => {
          const transcript = transcriptFromSpeechEvent(speechEvent);
          if (transcript !== "") {
            onTranscript(transcript);
          }
        };
        recognition.start();
      }}
    >
      Speak
    </Button>
  );
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
  const constructorValue =
    Reflect.get(window, "SpeechRecognition") ?? Reflect.get(window, "webkitSpeechRecognition");
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
