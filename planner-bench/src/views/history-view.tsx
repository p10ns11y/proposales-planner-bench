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
      trigger={
        <Button type="button" variant="ghost">
          History ({viewModel.entries.length})
        </Button>
      }
    >
      {viewModel.entries.length === 0 ? (
        <p>Filed briefs show up here.</p>
      ) : (
        <ul className="flex flex-col gap-3" data-history-count={viewModel.entries.length}>
          {viewModel.entries.map((entry) => (
            <li key={entry.id} className="rounded-md border border-border p-3">
              <button
                type="button"
                className="flex w-full flex-col items-start gap-1 text-left"
                onClick={() => onEvent({ type: "historyEntryChosen", entryId: entry.id })}
              >
                <span>{entry.title}</span>
                <span className="text-sm text-muted">
                  {entry.stage} · {entry.venueCount} venues · {entry.savedAt}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
