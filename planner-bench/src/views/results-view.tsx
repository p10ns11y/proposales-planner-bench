"use client";

import { Button } from "../design/ui/button";
import type { PlannerViewEvent, ResultsViewModel } from "../view-models/view-model";

type ResultsViewProps = {
  viewModel: ResultsViewModel;
  onEvent: (event: PlannerViewEvent) => void;
};

export function ResultsView({ viewModel, onEvent }: ResultsViewProps) {
  return (
    <section className="planner-results" aria-label="Results">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-lg">Matches</h2>
        {viewModel.phase === "results" ? (
          <p className="text-sm text-muted">{viewModel.rows.length} shown</p>
        ) : null}
      </div>
      <div className="planner-matches">
        {viewModel.phase !== "results" || viewModel.rows.length === 0 ? (
          <p className="text-sm text-muted">
            Ranked venues appear here after the brief is confirmed.
          </p>
        ) : (
          <ul className="flex flex-col">
            {viewModel.rows.map((row) => (
              <li key={row.venueName}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 border-b border-border py-3 text-left"
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
                      <span className="mt-0.5 block text-sm text-muted">
                        Held by {row.heldByCompanyName}
                      </span>
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
        )}
      </div>
      {viewModel.hiddenCount > 0 ? (
        <div className="pt-4">
          <Button type="button" variant="ghost" className="min-h-12 px-4" onClick={() => onEvent({ type: "showMore" })}>
            More
          </Button>
        </div>
      ) : null}
      {viewModel.openRow ? (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-foreground/20 p-4 sm:items-center"
          role="presentation"
          onClick={() => onEvent({ type: "rowClosed" })}
        >
          <div
            className="w-full max-w-md border border-border bg-card p-5 shadow-none"
            role="dialog"
            aria-label={viewModel.openRow.venueName}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl">{viewModel.openRow.venueName}</h3>
                {viewModel.openRow.heldByCompanyName ? (
                  <p className="mt-1 text-sm text-muted">
                    Held by {viewModel.openRow.heldByCompanyName}
                  </p>
                ) : null}
                {viewModel.openRow.favorite ? (
                  <p className="mt-1 text-sm text-muted">Favorite</p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" onClick={() => onEvent({ type: "rowClosed" })}>
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
        </div>
      ) : null}
    </section>
  );
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
