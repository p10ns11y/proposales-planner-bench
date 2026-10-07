"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Sheet } from "../design/ui/sheet";
import type { MoreFieldValues, PlannerViewEvent } from "../view-models/view-model";

type MoreDrawerProps = {
  more: MoreFieldValues;
  moreStamp: string;
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onEvent: (event: PlannerViewEvent) => void;
  onApplied: (line: string) => void;
};

const fieldKeys: (keyof MoreFieldValues)[] = [
  "eventTitle",
  "organisationName",
  "contactEmail",
  "language",
  "roomCount",
  "meetingRoomCount",
  "foodRequired",
  "notes",
  "budget",
];

export function MoreDrawer({
  more,
  moreStamp,
  open,
  disabled,
  onOpenChange,
  onCloseAutoFocus,
  onEvent,
  onApplied,
}: MoreDrawerProps) {
  return (
    <MoreForm
      key={moreStamp}
      more={more}
      open={open}
      disabled={disabled}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      onApply={(details) => {
        onEvent({ type: "moreEdited", details });
        onApplied(updateLine(details));
        onOpenChange(false);
      }}
    />
  );
}

function MoreForm({
  more,
  open,
  disabled,
  onOpenChange,
  onCloseAutoFocus,
  onApply,
}: {
  more: MoreFieldValues;
  open: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onApply: (details: Partial<MoreFieldValues>) => void;
}) {
  const [values, setValues] = useState(more);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = changedDetails(more, values);
    if (Object.keys(details).length === 0) {
      onOpenChange(false);
      return;
    }
    onApply(details);
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title="Refine the brief"
      description="Optional details for the venue request."
      onSubmit={submit}
      onCloseAutoFocus={onCloseAutoFocus}
      footer={
        <>
          <button type="button" className="planner-text-button" onClick={() => setValues(more)}>
            Reset
          </button>
          <button type="submit" className="planner-apply" disabled={disabled}>
            Apply
          </button>
        </>
      }
    >
      <div className="planner-fields">
        <TextField
          label="Event name"
          name="eventTitle"
          value={values.eventTitle}
          onChange={(eventTitle) => setValues({ ...values, eventTitle })}
        />
        <TextField
          label="Organisation"
          name="organisationName"
          value={values.organisationName}
          onChange={(organisationName) => setValues({ ...values, organisationName })}
        />
        <TextField
          label="Email"
          name="contactEmail"
          type="email"
          autoComplete="email"
          value={values.contactEmail}
          onChange={(contactEmail) => setValues({ ...values, contactEmail })}
        />
        <div className="planner-field">
          <span id="more-language-label">Language</span>
          <div className="planner-segment" role="group" aria-labelledby="more-language-label">
            <button
              type="button"
              aria-pressed={values.language === "en"}
              onClick={() => setValues({ ...values, language: "en" })}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={values.language === "sv"}
              onClick={() => setValues({ ...values, language: "sv" })}
            >
              Svenska
            </button>
          </div>
        </div>
        <div className="planner-step-pair">
          <CountStepper
            label="Rooms"
            value={values.roomCount}
            onChange={(roomCount) => setValues({ ...values, roomCount })}
          />
          <CountStepper
            label="Meeting rooms"
            value={values.meetingRoomCount}
            onChange={(meetingRoomCount) => setValues({ ...values, meetingRoomCount })}
          />
        </div>
        <div className="planner-switch-row">
          <span id="more-food-label">Food</span>
          <button
            type="button"
            className="planner-switch"
            role="switch"
            aria-labelledby="more-food-label"
            aria-checked={values.foodRequired === "yes"}
            onClick={() =>
              setValues({
                ...values,
                foodRequired: values.foodRequired === "yes" ? "no" : "yes",
              })
            }
          >
            <span />
          </button>
        </div>
        <TextField
          label="Budget (EUR)"
          name="budget"
          inputMode="numeric"
          value={values.budget}
          onChange={(budget) => setValues({ ...values, budget })}
        />
        <label className="planner-field" htmlFor="more-notes">
          Notes
          <textarea
            id="more-notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
        </label>
      </div>
    </Sheet>
  );
}

function CountStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const shown = value.trim() === "" ? "0" : value;
  return (
    <div className="planner-step-row" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="planner-stepper">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(stepCount(value, -1))}>
          <Minus aria-hidden="true" />
        </button>
        <span className="planner-step-value">{shown}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(stepCount(value, 1))}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function stepCount(current: string, delta: number): string {
  const parsed = current.trim() === "" ? 0 : Number(current);
  const base = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  const next = base + delta;
  if (next <= 0) {
    return "";
  }
  return String(next);
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  inputMode?: "numeric" | "text" | "email";
  autoComplete?: string;
}) {
  const id = `more-${name}`;
  return (
    <label className="planner-field" htmlFor={id}>
      {label}
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function changedDetails(base: MoreFieldValues, next: MoreFieldValues): Partial<MoreFieldValues> {
  const details: Partial<MoreFieldValues> = {};
  for (const key of fieldKeys) {
    const value = next[key].trim();
    if (value === base[key].trim()) {
      continue;
    }
    assignDetail(details, key, value);
  }
  return details;
}

function assignDetail(details: Partial<MoreFieldValues>, key: keyof MoreFieldValues, value: string) {
  if (key === "foodRequired") {
    if (value === "" || value === "yes" || value === "no") {
      details.foodRequired = value;
    }
    return;
  }
  if (key === "eventTitle") details.eventTitle = value;
  if (key === "organisationName") details.organisationName = value;
  if (key === "contactEmail") details.contactEmail = value;
  if (key === "language") details.language = value;
  if (key === "roomCount") details.roomCount = value;
  if (key === "meetingRoomCount") details.meetingRoomCount = value;
  if (key === "notes") details.notes = value;
  if (key === "budget") details.budget = value;
}

function updateLine(details: Partial<MoreFieldValues>): string {
  const parts: string[] = [];
  if (details.eventTitle !== undefined) {
    parts.push(details.eventTitle === "" ? "event name cleared" : details.eventTitle);
  }
  if (details.organisationName !== undefined) {
    parts.push(details.organisationName === "" ? "organisation cleared" : details.organisationName);
  }
  if (details.contactEmail !== undefined) {
    parts.push(details.contactEmail === "" ? "email cleared" : details.contactEmail);
  }
  if (details.language !== undefined) {
    parts.push(details.language === "" ? "language cleared" : `language ${details.language}`);
  }
  if (details.roomCount !== undefined) {
    parts.push(details.roomCount === "" ? "rooms cleared" : `${details.roomCount} rooms`);
  }
  if (details.meetingRoomCount !== undefined) {
    parts.push(
      details.meetingRoomCount === "" ? "meeting rooms cleared" : `${details.meetingRoomCount} meeting rooms`,
    );
  }
  if (details.foodRequired !== undefined) {
    parts.push(details.foodRequired === "yes" ? "food on" : details.foodRequired === "no" ? "food off" : "food cleared");
  }
  if (details.notes !== undefined) {
    parts.push(details.notes === "" ? "notes cleared" : "notes updated");
  }
  if (details.budget !== undefined) {
    parts.push(details.budget === "" ? "budget cleared" : `budget ${details.budget}`);
  }
  return `Updated: ${parts.join(", ")}`;
}
