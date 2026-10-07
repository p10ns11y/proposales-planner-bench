"use client";

import { History } from "lucide-react";
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
      description="Past briefs on this browser."
      side="left"
      trigger={
        <button type="button" className="planner-pill" aria-label="History">
          <History aria-hidden="true" />
          <span className="planner-pill-label">History</span>
        </button>
      }
    >
      {viewModel.entries.length === 0 ? (
        <p className="planner-meta">Past briefs show up here.</p>
      ) : (
        <ul className="planner-history-list" data-history-count={viewModel.entries.length}>
          {viewModel.entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="planner-history-item"
                onClick={() => onEvent({ type: "historyEntryChosen", entryId: entry.id })}
              >
                <span className="planner-offer-name">{entry.title}</span>
                <span className="planner-meta">
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
