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

  it("stores a guest count from More and clears it when the save is empty", () => {
    const saved = applyMoreDetails(brief, { attendeeCount: "30" });
    expect(saved.attendeeCount).toBe(30);
    expect(saved.meetingRoomCount).toBe(2);
    const cleared = applyMoreDetails(saved, { attendeeCount: "" });
    expect(cleared.attendeeCount).toBeUndefined();
    expect(cleared.meetingRoomCount).toBe(2);
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
    expect(view.more.attendeeCount).toBe("");
  });

  it("shows the stored guest count in More", () => {
    const snapshot = emptySnapshot([], "", []);
    snapshot.brief = plannerBriefSchema.parse({ attendeeCount: 40 });
    const view = shellViewModel({
      snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.more.attendeeCount).toBe("40");
  });

  it("fills More from the brief, including dates, times, basis, and currency", () => {
    const snapshot = emptySnapshot([], "", []);
    snapshot.brief = plannerBriefSchema.parse({
      eventTitle: "Harbour day",
      organisationName: "Northwind",
      contactEmail: "planner@northwind.example",
      city: "Stockholm",
      startDate: "2026-12-03",
      endDate: "2026-12-04",
      startTime: "09:00",
      endTime: "17:00",
      attendeeCount: 25,
      roomCount: 8,
      meetingRoomCount: 2,
      foodRequired: true,
      language: "en",
      notes: "Dinner in the hall",
      budget: { amount: 300, currency: "EUR", scope: "total", approximate: true },
    });
    const view = shellViewModel({
      snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.more).toMatchObject({
      eventTitle: "Harbour day",
      organisationName: "Northwind",
      contactEmail: "planner@northwind.example",
      city: "Stockholm",
      startDate: "2026-12-03",
      endDate: "2026-12-04",
      startTime: "09:00",
      endTime: "17:00",
      attendeeCount: "25",
      roomCount: "8",
      meetingRoomCount: "2",
      foodRequired: "yes",
      language: "en",
      notes: "Dinner in the hall",
      budget: "300",
      budgetBasis: "total",
      currency: "EUR",
    });
  });

  it("prefers a stored minor budget and keeps a fractional major amount", () => {
    const snapshot = emptySnapshot([], "", []);
    snapshot.brief = plannerBriefSchema.parse({
      city: "Stockholm",
      budgetMinor: { unit: "minor", amount: 10_050 },
      budget: { amount: 300, currency: "EUR", scope: "per-person" },
    });
    const view = shellViewModel({
      snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(view.more.budget).toBe("100.50");
    expect(view.more.budgetBasis).toBe("per-person");
    expect(view.more.currency).toBe("EUR");

    const fractional = shellViewModel({
      snapshot: {
        ...snapshot,
        brief: plannerBriefSchema.parse({
          city: "Stockholm",
          budget: { amount: 10.1, currency: "SEK" },
        }),
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(fractional.more.budget).toBe("10.1");
    expect(fractional.more.currency).toBe("SEK");
  });

  it("writes dates, times, city, basis, and currency back onto the brief", () => {
    const saved = applyMoreDetails(
      plannerBriefSchema.parse({
        budget: { amount: 300, currency: "EUR", approximate: true },
        startTime: "09:00",
      }),
      {
        city: "Stockholm",
        startDate: "2026-12-03",
        endDate: "2026-12-04",
        startTime: "10:00",
        endTime: "17:00",
        budgetBasis: "total",
        currency: "sek",
      },
    );
    expect(saved.city).toBe("Stockholm");
    expect(saved.startDate).toBe("2026-12-03");
    expect(saved.endDate).toBe("2026-12-04");
    expect(saved.startTime).toBe("10:00");
    expect(saved.endTime).toBe("17:00");
    expect(saved.budget?.scope).toBe("total");
    expect(saved.budget?.currency).toBe("SEK");
    expect(saved.statedCurrency).toBe("SEK");

    const cleared = applyMoreDetails(saved, {
      city: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "9:00",
      budgetBasis: "",
      currency: "",
    });
    expect(cleared.city).toBeUndefined();
    expect(cleared.startDate).toBeUndefined();
    expect(cleared.endDate).toBeUndefined();
    expect(cleared.startTime).toBeUndefined();
    expect(cleared.endTime).toBe("17:00");
    expect(cleared.budget?.scope).toBeUndefined();
    expect(cleared.statedCurrency).toBeUndefined();
    expect(cleared.budget?.currency).toBe("SEK");
    expect(cleared.budget?.amount).toBe(300);
  });

  it("leaves the basis alone when the brief has no budget amount", () => {
    const next = applyMoreDetails(plannerBriefSchema.parse({ city: "Stockholm" }), {
      budgetBasis: "total",
      currency: "nope",
    });
    expect(next.budget).toBeUndefined();
    expect(next.statedCurrency).toBeUndefined();
    expect(next.city).toBe("Stockholm");
  });
});
