"use client";

import { useState } from "react";
import type { InlineAskView } from "../view-models/view-model";
import { lcvInteract, lcvStay } from "./lcv";

type InlineAskCardProps = {
  ask: InlineAskView;
  busy: boolean;
  phase: string;
  onSave: (value: string) => void;
  onSkip: () => void;
};

export function InlineAskCard({ ask, busy, phase, onSave, onSkip }: InlineAskCardProps) {
  const [value, setValue] = useState("");
  return (
    <form
      className="planner-inline-ask"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() === "" || busy) {
          return;
        }
        onSave(value);
      }}
    >
      <label className="planner-field">
        {ask.label}
        <input
          type={ask.inputType}
          value={value}
          autoComplete={ask.inputType === "email" ? "email" : undefined}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <div className="planner-inline-row">
        <button
          type="submit"
          className="planner-primary"
          disabled={busy || value.trim() === ""}
          {...lcvStay("save-inline", phase)}
        >
          Save
        </button>
        <button type="button" className="planner-secondary" disabled={busy} {...skipEdge(phase)} onClick={onSkip}>
          Skip
        </button>
      </div>
    </form>
  );
}

export function NewEventCard({ label, phase, onStart }: { label: string; phase: string; onStart: () => void }) {
  return (
    <div className="planner-inline-ask">
      <p className="planner-text">Start a new chat for {label}.</p>
      <div className="planner-actions">
        <button
          type="button"
          className="planner-primary"
          {...lcvInteract({
            event: "new-chat",
            from: phase,
            success: "chat:capture",
            fail: phase,
            interrupted: phase,
          })}
          onClick={onStart}
        >
          Start a new chat
        </button>
      </div>
    </div>
  );
}

function skipEdge(phase: string) {
  if (phase === "chat:favorites") {
    return lcvInteract({
      event: "skip",
      from: "chat:favorites",
      success: "chat:results",
      fail: "chat:favorites",
      interrupted: "chat:favorites",
    });
  }
  return lcvStay("skip", phase);
}
