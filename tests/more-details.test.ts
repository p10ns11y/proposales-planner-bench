import { describe, expect, it } from "vitest";
import { formatBudgetMajor } from "../src/domain/minor-units";
import { plannerBriefSchema } from "../src/domain/planner-brief";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { applyMoreDetails } from "../src/flow/more-details";
import { shellViewModel } from "../src/view-models/selectors";

const brief = plannerBriefSchema.parse({
  city: "Stockholm",
  attendeeCount: 40,
  meetingRoomCount: 2,
  foodRequired: true,
  notes: "Dinner in the hall",
});

describe("applyMoreDetails", () => {
  it("leaves fields the save did not mention", () => {
    const next = applyMoreDetails(brief, {
      contactEmail: "planner@northwind.example",
      language: "en",
    });
    expect(next.contactEmail).toBe("planner@northwind.example");
    expect(next.language).toBe("en");
    expect(next.meetingRoomCount).toBe(2);
    expect(next.foodRequired).toBe(true);
    expect(next.notes).toBe("Dinner in the hall");
    expect(next.city).toBe("Stockholm");
    expect(next.attendeeCount).toBe(40);
  });

  it("clears a field when the save sends it empty", () => {
    const next = applyMoreDetails(brief, {
      meetingRoomCount: "",
      foodRequired: "",
    });
    expect(next.meetingRoomCount).toBeUndefined();
    expect(next.foodRequired).toBeUndefined();
    expect(next.notes).toBe("Dinner in the hall");
    expect(next.city).toBe("Stockholm");
    expect(next.attendeeCount).toBe(40);
  });

  it("edits budget in euros and stores cents", () => {
    const saved = applyMoreDetails(brief, { budget: "2500" });
    expect(saved.budgetMinor).toEqual({ unit: "minor", amount: 250_000 });
    expect(formatBudgetMajor(saved.budgetMinor?.amount ?? 0)).toBe("2500");

    const cents = applyMoreDetails(brief, { budget: "2500.50" });
    expect(cents.budgetMinor).toEqual({ unit: "minor", amount: 250_050 });
    expect(formatBudgetMajor(250_050)).toBe("2500.50");

    const grouped = applyMoreDetails(brief, { budget: "2,500" });
    expect(grouped.budgetMinor?.amount).toBe(250_000);

    const kept = applyMoreDetails(saved, { budget: "25.005" });
    expect(kept.budgetMinor).toEqual(saved.budgetMinor);

    const cleared = applyMoreDetails(saved, { budget: "" });
    expect(cleared.budgetMinor).toBeUndefined();
    expect(saved.notes).toBe("Dinner in the hall");
  });

  it("shows the stored EUR 2,500 budget as 2500", () => {
    const snapshot = emptySnapshot([], "", []);
    snapshot.brief = plannerBriefSchema.parse({
      budgetMinor: { unit: "minor", amount: 250_000 },
    });
    const view = shellViewModel({
      snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.more.budget).toBe("2500");
  });
});
