import { describe, expect, it } from "vitest";
import { northwindDayBrief } from "../src/contract/fixtures";
import { questionForGap } from "../src/domain/fitness";
import { minorUnits } from "../src/domain/minor-units";
import { describesDifferentEvent } from "../src/flow/event-split";
import { filingFingerprint } from "../src/flow/filing-guard";
import { historyTitle, upsertHistory } from "../src/flow/history-log";
import { leftUnfiledNote } from "../src/flow/inline-ask";
import { emptySnapshot, type PlannerSnapshot } from "../src/flow/planner-snapshot";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import { filedPhrase, formatHistoryWhen, historyMeta, venuePhrase } from "../src/view-models/history-row";
import { resultsViewModel, shellViewModel } from "../src/view-models/selectors";

describe("history and results view model", () => {
  it("stores a filed brief and formats minor units at the view edge", () => {
    const snapshot = {
      ...emptySnapshot(
        [{ id: 1, name: "Harbour House" }],
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
          favorite: false,
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
      favorite: false,
    });
  });

  it("names a brief from the title, then the type and city, then the city and date", () => {
    expect(historyTitle({ eventTitle: "  celebration ", city: "Oslo", startDate: "2026-11-12" })).toBe("celebration");
    expect(historyTitle({ city: "Stockholm", meetingRoomCount: 1 })).toBe("Meeting in Stockholm");
    expect(historyTitle({ city: "Stockholm", foodRequest: { meal: "dinner" } })).toBe("Dinner in Stockholm");
    expect(historyTitle({ city: "Stockholm", foodRequest: { meal: "lunch" } })).toBe("Lunch in Stockholm");
    expect(historyTitle({ city: "Stockholm", foodRequest: { meal: "breakfast" } })).toBe("Breakfast in Stockholm");
    expect(historyTitle({ city: "Gothenburg", roomCount: 2 })).toBe("Stay in Gothenburg");
    expect(historyTitle({ city: " Stockholm ", startDate: "2026-11-12" })).toBe("Stockholm, 12 Nov");
    expect(historyTitle({ meetingRoomCount: 1 })).toBe("Meeting");
    expect(historyTitle({ roomCount: 1 })).toBe("Stay");
    expect(historyTitle({ foodRequest: { meal: "dinner" } })).toBe("Dinner");
    expect(historyTitle({ city: "Oslo" })).toBe("Oslo");
    expect(historyTitle({ startDate: "2026-06-01" })).toBe("1 Jun");
    expect(historyTitle({})).toBe("Untitled brief");
    expect(historyTitle({ startDate: "not-a-date" })).toBe("Untitled brief");
  });

  it("keeps one history row per chat and counts later filings", () => {
    const base = emptySnapshot([{ id: 1, name: "Harbour House" }], "", []);
    const filed = {
      ...base,
      brief: { city: "Stockholm", startDate: "2026-11-12", attendeeCount: 20 },
      stage: "filed" as const,
      filing: { path: "inbox" as const, id: 1 },
    };
    const first = upsertHistory([], filed, "2026-10-08T12:34:00.000Z");
    const second = upsertHistory(
      first,
      { ...filed, filing: { path: "inbox", id: 2 }, offers: [{ venueName: "Hall" } as PlannerSnapshot["offers"][number]] },
      "2026-10-08T12:36:04.218Z",
    );
    expect(second).toHaveLength(1);
    expect(second[0]?.id).toBe(base.chatId);
    expect(second[0]?.title).toBe("Stockholm, 12 Nov");
    expect(second[0]?.filedCount).toBe(2);
    expect(second[0]?.venueCount).toBe(1);
    const repeat = upsertHistory(second, second[0]?.snapshot ?? filed, "2026-10-08T12:40:00.000Z");
    expect(repeat).toHaveLength(1);
    expect(repeat[0]?.filedCount).toBe(2);
    const other = upsertHistory(
      repeat,
      { ...filed, chatId: "other-chat", filing: { path: "inbox", id: 3 } },
      "2026-10-08T12:41:00.000Z",
    );
    expect(other).toHaveLength(2);
    expect(other[0]?.id).toBe("other-chat");
    const unfiled = upsertHistory(other, { ...filed, chatId: "other-chat", filing: null, offers: filed.offers }, "2026-10-08T12:42:00.000Z");
    expect(unfiled.find((entry) => entry.id === "other-chat")?.filedCount).toBe(1);
    expect(formatHistoryWhen("2026-10-08T12:36:04.218Z", "Europe/Stockholm")).toBe("Thu 8 Oct, 14:36");
    expect(formatHistoryWhen("not-a-time", "Europe/Stockholm")).toBe("not-a-time");
    expect(venuePhrase(1)).toBe("1 venue");
    expect(venuePhrase(2)).toBe("2 venues");
    expect(filedPhrase(1)).toBe("");
    expect(filedPhrase(2)).toBe("Filed twice");
    expect(filedPhrase(3)).toBe("Filed 3 times");
    expect(
      historyMeta({
        venueCount: 1,
        filedCount: 2,
        savedAt: "2026-10-08T12:36:04.218Z",
        timeZone: "Europe/Stockholm",
      }),
    ).toBe("1 venue · Filed twice · Thu 8 Oct, 14:36");
  });

  it("offers a new chat when the next message is a different event", async () => {
    expect(describesDifferentEvent({ city: "Stockholm", startDate: "2026-11-12" }, { city: "Gothenburg" })).toBe(true);
    expect(describesDifferentEvent({ city: "Stockholm", startDate: "2026-11-12" }, { startDate: "2026-06-01" })).toBe(true);
    expect(describesDifferentEvent({ city: "Stockholm" }, { city: " stockholm " })).toBe(false);
    expect(describesDifferentEvent({ city: "Stockholm", startDate: "2026-11-12" }, { attendeeCount: 30 })).toBe(false);
    expect(describesDifferentEvent({ city: "Stockholm" }, { city: "" })).toBe(false);
    expect(describesDifferentEvent({ startDate: "2026-11-12" }, { city: "Oslo" })).toBe(false);
    const brief = {
      eventTitle: "celebration",
      contactEmail: "ada@northwind.example",
      city: "Stockholm",
      startDate: "2026-11-12",
      endDate: "2026-11-12",
      startTime: "06:00",
      endTime: "12:00",
      attendeeCount: 20,
      language: "en",
    };
    const snapshot = {
      ...emptySnapshot([{ id: 1, name: "Harbour House" }], "", []),
      brief,
      stage: "filed" as const,
      phase: "results" as const,
      filing: { path: "inbox" as const, id: 9 },
      filingKey: filingFingerprint(brief),
    };
    const client = createFixtureClient();
    const moved = await runViewportAction({
      action: { type: "composerSubmitted", text: "Gothenburg on 1 June 2026 for 12 people" },
      snapshot,
      client,
      today: "2026-10-08",
      readPatch: async () => ({ city: "Gothenburg", startDate: "2026-06-01" }),
    });
    expect(moved.snapshot.brief).toEqual(brief);
    expect(moved.snapshot.filing).toEqual(snapshot.filing);
    expect(moved.snapshot.newEvent).toEqual({ label: "Gothenburg, 1 Jun" });
    const sameCity = await runViewportAction({
      action: { type: "composerSubmitted", text: "30 people" },
      snapshot,
      client,
      today: "2026-10-08",
      readPatch: async () => ({ attendeeCount: 30 }),
    });
    expect(sameCity.snapshot.newEvent).toBeNull();
    expect(sameCity.snapshot.brief.attendeeCount).toBe(30);
    expect(sameCity.snapshot.filing).toBeNull();
    const timed = await runViewportAction({
      action: { type: "composerSubmitted", text: "13:00" },
      snapshot,
      client,
      today: "2026-10-08",
      readPatch: async () => ({ endTime: "13:00" }),
    });
    expect(timed.snapshot.newEvent).toBeNull();
    expect(timed.snapshot.brief.endTime).toBe("13:00");
    expect(timed.snapshot.filing).toBeNull();
  });

  it("shows one inline input for a single missing fileable field and skips without filing", async () => {
    const client = createFixtureClient();
    const opening = emptySnapshot(await client.listCompanies(), "", []);
    const captured = await runViewportAction({
      action: {
        type: "composerSubmitted",
        text: "City Stockholm. Attendees 20. Start 2026-11-12. End 2026-11-12. Start time 06:00. End time 12:00. Language en.",
      },
      snapshot: { ...opening, selectedCompanyId: 1 },
      client,
      today: "2026-10-08",
    });
    const asked = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: captured.snapshot,
      client,
      today: "2026-10-08",
    });
    const askedView = shellViewModel({
      snapshot: asked.snapshot,
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(asked.snapshot.filing).toBeNull();
    expect(askedView.inlineAsk).toEqual({ field: "contactEmail", inputType: "email", label: "Email" });
    expect(askedView.filingMessage).toBeNull();
    const favoritesEmail = shellViewModel({
      snapshot: { ...asked.snapshot, phase: "favorites", gaps: ["contactEmail"] },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(favoritesEmail.showFavorites).toBe(false);
    expect(favoritesEmail.inlineAsk?.field).toBe("contactEmail");
    expect(askedView.notice).toBeNull();
    const skipped = await runViewportAction({
      action: { type: "inlineSkipped" },
      snapshot: asked.snapshot,
      client,
      today: "2026-10-08",
    });
    expect(skipped.snapshot.filing).toBeNull();
    expect(skipped.snapshot.notice).toBe(leftUnfiledNote);
    expect(skipped.snapshot.inlinePaused).toBe(true);
    const invalid = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "not-an-email" },
      snapshot: asked.snapshot,
      client,
      today: "2026-10-08",
    });
    expect(invalid.snapshot.brief.contactEmail).toBeUndefined();
    expect(invalid.snapshot.filing).toBeNull();
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "ada@northwind.example" },
      snapshot: asked.snapshot,
      client,
      today: "2026-10-08",
    });
    expect(saved.snapshot.brief.contactEmail).toBe("ada@northwind.example");
    expect(saved.snapshot.filing).not.toBeNull();
    const clockBrief = {
      contactEmail: "ada@northwind.example",
      city: "Stockholm",
      startDate: "2026-11-12",
      startTime: "06:00",
      endTime: "12:00",
      attendeeCount: 20,
      language: "en",
    };
    const clockView = shellViewModel({
      snapshot: {
        ...opening,
        brief: clockBrief,
        phase: "results",
        stage: "comparing",
        notice: questionForGap("endDate"),
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(clockView.fileGap).toBeNull();
    expect(clockView.inlineAsk).toBeNull();
    expect(clockView.filingMessage).toBeNull();
    expect(clockView.notice).toBeNull();
    const openDay = shellViewModel({
      snapshot: {
        ...opening,
        brief: {
          contactEmail: "ada@northwind.example",
          city: "Stockholm",
          startDate: "2026-11-12",
          attendeeCount: 20,
          language: "en",
        },
        phase: "results",
        stage: "fileable",
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(openDay.fileGap).toBe("endDate");
    expect(openDay.inlineAsk).toEqual({ field: "endDate", inputType: "date", label: "End date" });
    expect(openDay.filingMessage).toBeNull();
    const language = shellViewModel({
      snapshot: {
        ...opening,
        brief: {
          contactEmail: "ada@northwind.example",
          startDate: "2026-12-03",
          endDate: "2026-12-03",
          attendeeCount: 25,
        },
        phase: "favorites",
        gaps: ["language"],
        nextQuestion: questionForGap("language"),
        notice: questionForGap("language"),
      },
      busy: false,
      errorText: null,
      speechAvailable: false,
    });
    expect(language.inlineAsk).toBeNull();
    expect(language.ask).toBe(questionForGap("language"));
    expect(language.fileGap).toBe("language");
    expect(language.filingMessage).toBe(questionForGap("language"));
  });
});
