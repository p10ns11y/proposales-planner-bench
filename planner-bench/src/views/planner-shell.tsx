"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../design/ui/button";
import type { MoreFieldValues, PlannerViewEvent, ShellViewModel } from "../view-models/view-model";
import { startSpeechCapture } from "./speech-input";

type PlannerShellProps = {
  viewModel: ShellViewModel;
  onEvent: (event: PlannerViewEvent) => void;
  historyControl: ReactNode;
};

export function PlannerShell({ viewModel, onEvent, historyControl }: PlannerShellProps) {
  const [draft, setDraft] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (viewModel.openRow !== null && !dialog.open) {
      dialog.showModal();
    }
    if (viewModel.openRow === null && dialog.open) {
      dialog.close();
    }
  }, [viewModel.openRow]);

  return (
    <div className="planner-frame" data-phase={viewModel.phase}>
      <div className="planner-thread">
        {viewModel.notice ? (
          <p role="status" className="mb-4 text-base">
            {viewModel.notice}
          </p>
        ) : null}
        {viewModel.draftConfirmation ? (
          <p role="status" className="mb-4 text-base">
            {viewModel.draftConfirmation}
          </p>
        ) : null}
        <h1
          id="planner-ask"
          className="mb-4 text-2xl leading-tight text-balance"
          data-must-show={viewModel.phase === "results" ? "facts" : undefined}
        >
          {viewModel.askLabelsComposer ? <label htmlFor="composer">{viewModel.ask}</label> : viewModel.ask}
        </h1>
        {viewModel.showFacts ? (
          <p className="mb-4 text-base" data-must-show="facts">
            {viewModel.factsSentence}
          </p>
        ) : null}
        {viewModel.showConfirm ? (
          <div className="mb-6">
            <Button
              type="button"
              className="min-h-12 px-4"
              disabled={viewModel.busy || !viewModel.ready}
              onClick={() => onEvent({ type: "briefConfirmed" })}
            >
              Yes
            </Button>
          </div>
        ) : null}
        {viewModel.showFavorites ? (
          <div className="mb-6">
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 px-4"
              disabled={viewModel.busy || !viewModel.ready}
              onClick={() => onEvent({ type: "favoritesSubmitted", text: "skip" })}
            >
              Skip
            </Button>
          </div>
        ) : null}
        {viewModel.sampleOfferLabel ? (
          <p className="mb-3 text-sm text-muted">{viewModel.sampleOfferLabel}</p>
        ) : null}
        {viewModel.rows.length > 0 ? (
          <ul className="mb-6 flex flex-col">
            {viewModel.rows.map((row) => (
              <li key={row.venueName}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-start justify-between gap-4 border-b border-border py-3 text-left"
                  data-venue={row.venueName}
                  data-gap={row.gaps.length > 0 ? "missing" : "clear"}
                  data-favorite={row.favorite ? "yes" : "no"}
                  onClick={() => onEvent({ type: "rowOpened", venueName: row.venueName })}
                >
                  <span className="min-w-0">
                    <span className="block text-base">
                      {row.venueName}
                      {row.favorite ? <span className="ml-2 text-sm text-muted">Favorite</span> : null}
                    </span>
                    {row.heldByCompanyName ? (
                      <span className="mt-0.5 block text-sm text-muted">Held by {row.heldByCompanyName}</span>
                    ) : null}
                    {row.gaps.length > 0 ? (
                      <span className="mt-1 block text-sm text-muted">{row.gaps.map(gapLabel).join(", ")}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{row.total}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {viewModel.hiddenCount > 0 ? (
          <div className="mb-6">
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 px-4"
              onClick={() => onEvent({ type: "showMore" })}
            >
              Further matches
            </Button>
          </div>
        ) : null}
        {viewModel.errorText ? (
          <p role="alert" className="mb-4 text-sm">
            {viewModel.errorText}
          </p>
        ) : null}
        <details className="mb-8 border border-border bg-card" data-must-show="more">
          <summary className="min-h-12 cursor-pointer px-3 py-3 text-base">More</summary>
          <MoreForm
            key={viewModel.moreStamp}
            more={viewModel.more}
            disabled={viewModel.busy || !viewModel.ready}
            onSave={(details) => onEvent({ type: "moreEdited", details })}
          />
        </details>
      </div>
      <form
        className="planner-composer"
        data-must-show="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (text === "" || viewModel.busy || !viewModel.ready) {
            return;
          }
          onEvent({ type: "composerSubmitted", text });
          setDraft("");
        }}
      >
        <input
          id="composer"
          name="composer"
          className="planner-field min-h-12 min-w-0 flex-1 border border-border bg-card px-3 text-base outline-none"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={viewModel.composerPlaceholder}
          enterKeyHint="send"
          type={viewModel.inputType}
          inputMode={viewModel.inputMode}
          autoComplete={viewModel.autoComplete}
          disabled={!viewModel.ready}
        />
        <Button type="submit" className="min-h-12 px-4" disabled={viewModel.busy || !viewModel.ready}>
          {viewModel.busy ? "Working" : "Send"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-12 px-4"
          disabled={!viewModel.speechAvailable || viewModel.busy || !viewModel.ready}
          onClick={() => {
            startSpeechCapture((transcript) => setDraft(transcript));
          }}
        >
          Speak
        </Button>
        {historyControl}
      </form>
      <dialog
        ref={dialogRef}
        className="planner-detail"
        aria-label={viewModel.openRow?.venueName ?? "Venue"}
        onClose={() => {
          if (viewModel.openRow !== null) {
            onEvent({ type: "rowClosed" });
          }
        }}
      >
        {viewModel.openRow ? (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">{viewModel.openRow.venueName}</h2>
                {viewModel.openRow.heldByCompanyName ? (
                  <p className="mt-1 text-sm text-muted">Held by {viewModel.openRow.heldByCompanyName}</p>
                ) : null}
                {viewModel.openRow.favorite ? <p className="mt-1 text-sm text-muted">Favorite</p> : null}
              </div>
              <Button type="button" variant="ghost" className="min-h-12 px-4" onClick={() => dialogRef.current?.close()}>
                Close
              </Button>
            </div>
            <dl className="grid gap-2 text-sm">
              <DetailLine label="Rooms" value={viewModel.openRow.rooms} />
              <DetailLine label="Food" value={viewModel.openRow.foodAndBeverage} />
              <DetailLine label="Space" value={viewModel.openRow.space} />
              <DetailLine label="Extras" value={viewModel.openRow.extras} />
              <DetailLine label="Total" value={viewModel.openRow.total} />
              <DetailLine label="Expires" value={viewModel.openRow.expires} />
              <DetailLine
                label="Gaps"
                value={viewModel.openRow.gaps.length === 0 ? "None" : viewModel.openRow.gaps.map(gapLabel).join(", ")}
              />
            </dl>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

function MoreForm({
  more,
  disabled,
  onSave,
}: {
  more: MoreFieldValues;
  disabled: boolean;
  onSave: (details: MoreFieldValues) => void;
}) {
  return (
    <form
      className="grid gap-3 border-t border-border px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSave({
          eventTitle: fieldText(data, "eventTitle"),
          organisationName: fieldText(data, "organisationName"),
          contactEmail: fieldText(data, "contactEmail"),
          language: fieldText(data, "language"),
          roomCount: fieldText(data, "roomCount"),
          meetingRoomCount: fieldText(data, "meetingRoomCount"),
          foodRequired: foodField(data),
          notes: fieldText(data, "notes"),
          budget: fieldText(data, "budget"),
        });
      }}
    >
      <Field label="Event name" name="eventTitle" defaultValue={more.eventTitle} />
      <Field label="Organisation" name="organisationName" defaultValue={more.organisationName} />
      <Field label="Email" name="contactEmail" defaultValue={more.contactEmail} type="email" autoComplete="email" />
      <Field label="Language" name="language" defaultValue={more.language} />
      <Field label="Rooms" name="roomCount" defaultValue={more.roomCount} inputMode="numeric" />
      <Field label="Meeting rooms" name="meetingRoomCount" defaultValue={more.meetingRoomCount} inputMode="numeric" />
      <label className="grid gap-1 text-sm" htmlFor="more-food">
        Food
        <select
          id="more-food"
          name="foodRequired"
          defaultValue={more.foodRequired}
          className="planner-field min-h-12 border border-border bg-card px-3 text-base"
        >
          <option value="">Unset</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm" htmlFor="more-notes">
        Notes
        <textarea
          id="more-notes"
          name="notes"
          defaultValue={more.notes}
          rows={3}
          className="planner-field min-h-12 border border-border bg-card px-3 py-2 text-base"
        />
      </label>
      <Field label="Budget" name="budget" defaultValue={more.budget} inputMode="numeric" />
      <Button type="submit" className="min-h-12 px-4" disabled={disabled}>
        Save
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "text" | "email";
  inputMode?: "numeric" | "text" | "email";
  autoComplete?: string;
}) {
  const id = `more-${name}`;
  return (
    <label className="grid gap-1 text-sm" htmlFor={id}>
      {label}
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="planner-field min-h-12 border border-border bg-card px-3 text-base"
      />
    </label>
  );
}

function fieldText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

function foodField(data: FormData): MoreFieldValues["foodRequired"] {
  const value = fieldText(data, "foodRequired");
  if (value === "yes" || value === "no") {
    return value;
  }
  return "";
}

function gapLabel(gap: string): string {
  if (gap === "foodAndBeverage") {
    return "No food";
  }
  if (gap === "expired") {
    return "Expired";
  }
  if (gap === "space") {
    return "No meeting space";
  }
  if (gap === "rooms") {
    return "No rooms";
  }
  return gap;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
