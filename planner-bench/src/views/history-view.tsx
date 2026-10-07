"use client";

import { Button } from "../design/ui/button";
import { Sheet } from "../design/ui/sheet";
import type { HistoryViewModel, PlannerViewEvent } from "../view-models/view-model";

type HistoryViewProps = {
  viewModel: HistoryViewModel;
  onEvent: (event: PlannerViewEvent) => void;
};

export function HistoryView({ viewModel, onEvent }: HistoryViewProps) {
  return (
    <Sheet
      open={viewModel.open}
      onOpenChange={(open) => onEvent({ type: "historyToggled", open })}
      title="History"
      side="left"
      trigger={
        <Button type="button" variant="ghost" className="min-h-12 px-4 text-sm text-muted">
          History
        </Button>
      }
    >
      {viewModel.entries.length === 0 ? (
        <p className="text-sm text-muted">Past briefs show up here.</p>
      ) : (
        <ul className="flex flex-col gap-3" data-history-count={viewModel.entries.length}>
          {viewModel.entries.map((entry) => (
            <li key={entry.id} className="border border-border p-3">
              <button
                type="button"
                className="flex w-full flex-col items-start gap-1 text-left"
                onClick={() => onEvent({ type: "historyEntryChosen", entryId: entry.id })}
              >
                <span>{entry.title}</span>
                <span className="text-sm text-muted">
                  {entry.venueCount} venues · {entry.savedAt}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
