"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../design/ui/button";
import type { CaptureViewModel, PlannerViewEvent } from "../view-models/view-model";

type CaptureViewProps = {
  viewModel: CaptureViewModel;
  onEvent: (event: PlannerViewEvent) => void;
  historyControl: ReactNode;
};

export function CaptureView({ viewModel, onEvent, historyControl }: CaptureViewProps) {
  const [draft, setDraft] = useState("");
  const [gapDraft, setGapDraft] = useState("");
  const [favoriteDraft, setFavoriteDraft] = useState("");
  const [briefDraft, setBriefDraft] = useState(viewModel.briefFields);

  useEffect(() => {
    setBriefDraft(viewModel.briefFields);
  }, [viewModel.briefFields]);

  return (
    <section className="planner-capture" aria-label="Brief">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm tracking-wide text-muted">Planner bench</p>
          <h1 className="mt-1 text-2xl leading-tight">What do you need?</h1>
        </div>
        {historyControl}
      </div>
      <div className="planner-scroll flex flex-col gap-5">
        {viewModel.phase === "capture" ? (
          <form
            className="flex flex-col gap-3"
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
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-muted">Type, paste, or speak</span>
              <textarea
                className="min-h-36 w-full resize-none border border-border bg-card px-3 py-3 text-base leading-relaxed outline-none focus:border-foreground"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                name="capture"
                placeholder="I need a place in Stockholm for 40 people on 12 November 2026, with dinner and a meeting room."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={viewModel.busy || !viewModel.ready}>
                {viewModel.busy ? "Working" : "Continue"}
              </Button>
              <SpeakButton
                disabled={!viewModel.speechAvailable || viewModel.busy || !viewModel.ready}
                onTranscript={(transcript) => setDraft(transcript)}
              />
            </div>
          </form>
        ) : null}

        {viewModel.phase === "confirm" ? (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted">Cleaned brief. Edit anything that looks off.</p>
            <BriefEditor
              fields={briefDraft}
              onChange={setBriefDraft}
              onBlur={(fields) => onEvent({ type: "briefEdited", brief: briefFromFields(fields) })}
            />
            {viewModel.nextQuestion !== "" && viewModel.nextQuestion !== "Does this brief look right?" ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = gapDraft.trim();
                  if (text === "" || viewModel.busy) {
                    return;
                  }
                  onEvent({ type: "gapAnswered", text });
                  setGapDraft("");
                }}
              >
                <label className="flex flex-col gap-2 text-sm">
                  <span>{viewModel.nextQuestion}</span>
                  <input
                    className="border border-border bg-card px-3 py-2 outline-none focus:border-foreground"
                    value={gapDraft}
                    onChange={(event) => setGapDraft(event.target.value)}
                    name="gap"
                  />
                </label>
                <Button type="submit" variant="ghost" disabled={viewModel.busy}>
                  Answer
                </Button>
              </form>
            ) : (
              <p className="text-sm">{viewModel.nextQuestion}</p>
            )}
            <Button
              type="button"
              disabled={viewModel.busy}
              onClick={() => {
                onEvent({ type: "briefConfirmed", brief: briefFromFields(briefDraft) });
              }}
            >
              Confirm brief
            </Button>
          </div>
        ) : null}

        {viewModel.phase === "favorites" ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (viewModel.busy) {
                return;
              }
              onEvent({ type: "favoritesSubmitted", text: favoriteDraft });
              setFavoriteDraft("");
            }}
          >
            <label className="flex flex-col gap-2 text-sm">
              <span>{viewModel.nextQuestion}</span>
              <input
                className="border border-border bg-card px-3 py-2 outline-none focus:border-foreground"
                value={favoriteDraft}
                onChange={(event) => setFavoriteDraft(event.target.value)}
                name="favorites"
                placeholder="Harbour House, Ridge Hall…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={viewModel.busy}>
                {viewModel.busy ? "Finding venues" : "Find venues"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={viewModel.busy}
                onClick={() => onEvent({ type: "favoritesSubmitted", text: "" })}
              >
                Skip
              </Button>
            </div>
          </form>
        ) : null}

        {viewModel.phase === "results" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Brief used for this ranking</p>
            <dl className="grid gap-2 text-sm">
              {viewModel.briefLines.map((line) => (
                <div key={line.label} className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt className="text-muted">{line.label}</dt>
                  <dd>{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {viewModel.errorText ? <p role="alert">{viewModel.errorText}</p> : null}
      </div>
    </section>
  );
}

function BriefEditor({
  fields,
  onChange,
  onBlur,
}: {
  fields: CaptureViewModel["briefFields"];
  onChange: (fields: CaptureViewModel["briefFields"]) => void;
  onBlur: (fields: CaptureViewModel["briefFields"]) => void;
}) {
  const fieldClass =
    "border border-border bg-card px-2 py-1.5 text-sm outline-none focus:border-foreground";
  return (
    <div className="grid gap-2">
      {(
        [
          ["eventTitle", "Event"],
          ["contactEmail", "Email"],
          ["organisationName", "Organisation"],
          ["startDate", "Start"],
          ["endDate", "End"],
          ["attendeeCount", "Attendees"],
          ["roomCount", "Rooms"],
          ["meetingRoomCount", "Meeting rooms"],
          ["city", "City"],
          ["language", "Language"],
          ["notes", "Notes"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
          <span className="text-muted">{label}</span>
          <input
            className={fieldClass}
            value={fields[key]}
            onChange={(event) => onChange({ ...fields, [key]: event.target.value })}
            onBlur={() => onBlur(fields)}
            name={key}
          />
        </label>
      ))}
      <label className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
        <span className="text-muted">Food</span>
        <select
          className={fieldClass}
          value={fields.foodRequired}
          onChange={(event) => {
            const foodRequired = event.target.value as "" | "yes" | "no";
            const next = { ...fields, foodRequired };
            onChange(next);
            onBlur(next);
          }}
          name="foodRequired"
        >
          <option value="">—</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </label>
    </div>
  );
}

function briefFromFields(fields: CaptureViewModel["briefFields"]) {
  return {
    eventTitle: emptyToUndefined(fields.eventTitle),
    contactEmail: emptyToUndefined(fields.contactEmail),
    organisationName: emptyToUndefined(fields.organisationName),
    startDate: emptyToUndefined(fields.startDate),
    endDate: emptyToUndefined(fields.endDate),
    attendeeCount: numberOrUndefined(fields.attendeeCount),
    roomCount: numberOrUndefined(fields.roomCount),
    meetingRoomCount: numberOrUndefined(fields.meetingRoomCount),
    city: emptyToUndefined(fields.city),
    language: emptyToUndefined(fields.language),
    foodRequired: fields.foodRequired === "" ? undefined : fields.foodRequired === "yes",
    notes: emptyToUndefined(fields.notes),
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
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
