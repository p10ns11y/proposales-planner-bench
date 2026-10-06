import { describe, expect, it } from "vitest";
import { northwindDayBrief } from "../src/contract/fixtures";
import { minorUnits } from "../src/domain/minor-units";
import { upsertHistory } from "../src/flow/history-log";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { resultsViewModel } from "../src/view-models/selectors";

describe("history and results view model", () => {
  it("stores a filed brief and formats minor units at the view edge", () => {
    const snapshot = {
      ...emptySnapshot(
        [{ id: 1, name: "Harbour House", inboxToken: "inbox-harbour" }],
        "ready",
        [],
      ),
      brief: northwindDayBrief,
      stage: "comparing" as const,
      filing: { path: "inbox" as const, id: 100 },
      offers: [],
      grid: [
        {
          venueName: "Harbour House",
          currency: "EUR",
          roomsMinor: minorUnits(20_000),
          foodAndBeverageMinor: minorUnits(6_000),
          spaceMinor: minorUnits(10_000),
          extrasMinor: minorUnits(500),
          totalMinor: minorUnits(36_500),
          expiresAt: "2026-12-01T00:00:00.000Z",
          gaps: [],
        },
      ],
    };
    const history = upsertHistory([], snapshot, "2026-10-06T12:00:00.000Z");
    expect(history).toHaveLength(1);
    expect(history[0]?.title).toBe("Northwind offsite");
    expect(resultsViewModel(snapshot).rows[0]).toMatchObject({
      venueName: "Harbour House",
      rooms: "200.00 EUR",
      total: "365.00 EUR",
      expires: "2026-12-01",
    });
  });
});
