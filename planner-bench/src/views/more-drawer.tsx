"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Sheet } from "../design/ui/sheet";
import type { MoreFieldValues, PlannerViewEvent } from "../view-models/view-model";
import { emailApplyDecision, emailReplyHint } from "./file-brief-state";
import { lcvInteract, lcvMachine, lcvStay } from "./lcv";
import { moreUpdateLine } from "./more-update";

type MoreDrawerProps = {
  more: MoreFieldValues;
  moreStamp: string;
  currency: string;
  open: boolean;
  focusEmail: boolean;
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
  "attendeeCount",
  "roomCount",
  "meetingRoomCount",
  "foodRequired",
  "notes",
  "budget",
];

export function MoreDrawer({
  more,
  moreStamp,
  currency,
  open,
  focusEmail,
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
      currency={currency}
      open={open}
      focusEmail={focusEmail}
      disabled={disabled}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      onApply={(details) => {
        const line = moreUpdateLine(details);
        if (line !== "Nothing changed") {
          onEvent({ type: "moreEdited", details });
        }
        onApplied(line);
        onOpenChange(false);
      }}
    />
  );
}

function MoreForm({
  more,
  currency,
  open,
  focusEmail,
  disabled,
  onOpenChange,
  onCloseAutoFocus,
  onApply,
}: {
  more: MoreFieldValues;
  currency: string;
  open: boolean;
  focusEmail: boolean;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onApply: (details: Partial<MoreFieldValues>) => void;
}) {
  const [values, setValues] = useState(more);
  const [emailInvalid, setEmailInvalid] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailApplyDecision({ required: focusEmail, email: values.contactEmail }) === "need-email") {
      setEmailInvalid(true);
      return;
    }
    onApply(changedDetails(more, values));
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title="Add details"
      description={focusEmail ? "Email is required." : "Optional details for the venue request."}
      onSubmit={submit}
      onOpenAutoFocus={focusEmail ? focusEmailField : undefined}
      onCloseAutoFocus={onCloseAutoFocus}
      contentAttributes={lcvMachine("more", "more:open", "more:closed more:open")}
      closeAttributes={lcvInteract({
        event: "close-more",
        from: "more:open",
        success: "more:closed",
        fail: "more:open",
        interrupted: "more:open",
      })}
      footer={
        <>
          <button type="button" className="planner-text-button" {...lcvStay("reset-more", "more:open")} onClick={() => setValues(more)}>
            Reset
          </button>
          <button
            type="submit"
            className="planner-apply"
            disabled={disabled}
            {...lcvInteract({
              event: "save-more",
              from: "more:open",
              success: "more:closed",
              fail: "more:open",
              interrupted: "more:open",
            })}
          >
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
          required={focusEmail}
          invalid={emailInvalid}
          hint={focusEmail ? emailReplyHint : undefined}
          onChange={(contactEmail) => {
            setEmailInvalid(false);
            setValues({ ...values, contactEmail });
          }}
        />
        <div className="planner-field">
          <span id="more-language-label">Language</span>
          <div
            className="planner-segment"
            role="group"
            aria-labelledby="more-language-label"
            aria-describedby="more-language-hint"
          >
            <button
              type="button"
              aria-pressed={values.language === "en"}
              {...lcvStay("language-en", "more:open")}
              onClick={() => setValues({ ...values, language: "en" })}
            >
              English
            </button>
            <button
              type="button"
              aria-pressed={values.language === "sv"}
              {...lcvStay("language-sv", "more:open")}
              onClick={() => setValues({ ...values, language: "sv" })}
            >
              Svenska
            </button>
          </div>
          <p id="more-language-hint" className="planner-field-hint">
            Language of the request venues receive
          </p>
        </div>
        <CountStepper
          label="Guests"
          value={values.attendeeCount}
          onChange={(attendeeCount) => setValues({ ...values, attendeeCount })}
        />
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
        <div className="planner-switch-row">
          <span id="more-food-label">Food</span>
          <button
            type="button"
            className="planner-switch"
            role="switch"
            aria-labelledby="more-food-label"
            aria-checked={values.foodRequired === "yes"}
            {...lcvStay("food", "more:open")}
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
          label={`Budget (${currency})`}
          name="budget"
          inputMode="decimal"
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
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          {...lcvStay("step-down", "more:open")}
          onClick={() => onChange(stepCount(value, -1))}
        >
          <Minus aria-hidden="true" />
        </button>
        <span className="planner-step-value">{shown}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          {...lcvStay("step-up", "more:open")}
          onClick={() => onChange(stepCount(value, 1))}
        >
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

function focusEmailField(event: Event) {
  event.preventDefault();
  const field = document.getElementById("more-contactEmail");
  if (field instanceof HTMLInputElement) {
    field.focus();
  }
}

function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  required = false,
  invalid = false,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  inputMode?: "numeric" | "decimal" | "text" | "email";
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
}) {
  const id = `more-${name}`;
  const hintId = `${id}-hint`;
  return (
    <div className="planner-field-block" data-invalid={invalid ? "true" : "false"} data-required={required ? "true" : "false"}>
      <label className="planner-field" htmlFor={id}>
        {label}
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          aria-required={required ? "true" : undefined}
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {required ? (
        <span className="planner-required" aria-hidden="true">
          Required
        </span>
      ) : null}
      {hint ? (
        <p id={hintId} className="planner-field-note">
          {hint}
        </p>
      ) : null}
    </div>
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
  if (key === "attendeeCount") details.attendeeCount = value;
  if (key === "roomCount") details.roomCount = value;
  if (key === "meetingRoomCount") details.meetingRoomCount = value;
  if (key === "notes") details.notes = value;
  if (key === "budget") details.budget = value;
}
