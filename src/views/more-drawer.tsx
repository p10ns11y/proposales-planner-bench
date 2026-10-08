"use client";

import { ChevronDown, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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

export type DetailFold = "contact" | "event" | "people" | "budget" | "preferences";

const foldTitle: Record<DetailFold, string> = {
  contact: "Contact",
  event: "Event and dates",
  people: "People and rooms",
  budget: "Budget",
  preferences: "Preferences",
};

const fieldKeys: (keyof MoreFieldValues)[] = [
  "eventTitle",
  "organisationName",
  "contactEmail",
  "city",
  "language",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
  "attendeeCount",
  "roomCount",
  "meetingRoomCount",
  "foodRequired",
  "notes",
  "budget",
  "budgetBasis",
  "currency",
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
  const [openFold, setOpenFold] = useState<DetailFold>(() => openDetailSection(more));
  const opened = useRef(false);
  useEffect(() => {
    if (!open) {
      opened.current = false;
      return;
    }
    if (opened.current) {
      return;
    }
    opened.current = true;
    setOpenFold(openDetailSection(more));
  }, [open, more]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailApplyDecision({ required: focusEmail, email: values.contactEmail }) === "need-email") {
      setEmailInvalid(true);
      setOpenFold("contact");
      return;
    }
    onApply(changedDetails(more, values));
  }
  const budgetName = budgetLabel(values.currency, currency);
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
      <div className="planner-folds">
        <Fold id="contact" open={openFold === "contact"} onOpen={setOpenFold}>
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
        </Fold>
        <Fold id="event" open={openFold === "event"} onOpen={setOpenFold}>
          <TextField
            label="Event name"
            name="eventTitle"
            value={values.eventTitle}
            onChange={(eventTitle) => setValues({ ...values, eventTitle })}
          />
          <TextField label="City" name="city" value={values.city} onChange={(city) => setValues({ ...values, city })} />
          <TextField
            label="Start date"
            name="startDate"
            autoComplete="off"
            value={values.startDate}
            onChange={(startDate) => setValues({ ...values, startDate })}
          />
          <TextField
            label="End date"
            name="endDate"
            autoComplete="off"
            value={values.endDate}
            onChange={(endDate) => setValues({ ...values, endDate })}
          />
          <TextField
            label="Start time"
            name="startTime"
            autoComplete="off"
            value={values.startTime}
            onChange={(startTime) => setValues({ ...values, startTime })}
          />
          <TextField
            label="End time"
            name="endTime"
            autoComplete="off"
            value={values.endTime}
            onChange={(endTime) => setValues({ ...values, endTime })}
          />
        </Fold>
        <Fold id="people" open={openFold === "people"} onOpen={setOpenFold}>
          <CountStepper
            label="Guests"
            value={values.attendeeCount}
            onChange={(attendeeCount) => setValues({ ...values, attendeeCount })}
          />
          <CountStepper label="Rooms" value={values.roomCount} onChange={(roomCount) => setValues({ ...values, roomCount })} />
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
        </Fold>
        <Fold id="budget" open={openFold === "budget"} onOpen={setOpenFold}>
          <TextField
            label={budgetName}
            name="budget"
            inputMode="decimal"
            value={values.budget}
            onChange={(budget) => setValues({ ...values, budget })}
          />
          <div className="planner-field">
            <span id="more-basis-label">Budget basis</span>
            <div className="planner-segment" role="group" aria-labelledby="more-basis-label">
              <button
                type="button"
                aria-pressed={values.budgetBasis === "total"}
                {...lcvStay("basis-total", "more:open")}
                onClick={() => setValues({ ...values, budgetBasis: "total" })}
              >
                Total
              </button>
              <button
                type="button"
                aria-pressed={values.budgetBasis === "per-person"}
                {...lcvStay("basis-per-person", "more:open")}
                onClick={() => setValues({ ...values, budgetBasis: "per-person" })}
              >
                Per person
              </button>
            </div>
          </div>
          <TextField
            label="Currency"
            name="currency"
            autoComplete="off"
            value={values.currency}
            onChange={(next) => setValues({ ...values, currency: next.toUpperCase() })}
          />
        </Fold>
        <Fold id="preferences" open={openFold === "preferences"} onOpen={setOpenFold}>
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
        </Fold>
      </div>
    </Sheet>
  );
}

function Fold({
  id,
  open,
  onOpen,
  children,
}: {
  id: DetailFold;
  open: boolean;
  onOpen: (id: DetailFold) => void;
  children: ReactNode;
}) {
  const buttonId = `more-fold-${id}`;
  const panelId = `more-panel-${id}`;
  return (
    <div className="planner-fold">
      <h3 className="planner-fold-heading">
        <button
          type="button"
          id={buttonId}
          className="planner-fold-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          {...lcvStay(`fold-${id}`, "more:open")}
          onClick={() => onOpen(id)}
        >
          <span>{foldTitle[id]}</span>
          <ChevronDown aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="planner-fold-panel">
        {children}
      </div>
    </div>
  );
}

export function openDetailSection(values: MoreFieldValues): DetailFold {
  if (values.contactEmail.trim() === "") {
    return "contact";
  }
  if (values.startDate.trim() === "" || values.endDate.trim() === "") {
    return "event";
  }
  if (values.attendeeCount.trim() === "" || overnightRoomsMissing(values)) {
    return "people";
  }
  if (values.budget.trim() !== "" && values.budgetBasis === "") {
    return "budget";
  }
  if (values.language.trim() === "") {
    return "preferences";
  }
  return "contact";
}

function overnightRoomsMissing(values: MoreFieldValues): boolean {
  const start = values.startDate.trim();
  const end = values.endDate.trim();
  if (start === "" || end === "" || end <= start) {
    return false;
  }
  return values.roomCount.trim() === "";
}

function budgetLabel(field: string, fallback: string): string {
  const code = field.trim();
  return `Budget (${code === "" ? fallback : code})`;
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
  if (key === "budgetBasis") {
    if (value === "" || value === "total" || value === "per-person") {
      details.budgetBasis = value;
    }
    return;
  }
  if (isTextKey(key)) {
    details[key] = value;
  }
}

function isTextKey(key: keyof MoreFieldValues): key is Exclude<keyof MoreFieldValues, "foodRequired" | "budgetBasis"> {
  return key !== "foodRequired" && key !== "budgetBasis";
}
