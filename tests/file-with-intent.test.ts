import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openingSnapshot } from "../src/flow/chat-request";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { leftUnfiledNote } from "../src/flow/inline-ask";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { BriefDraft, ProposalesClient } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";
import { fileBriefLabel } from "../src/views/file-brief-state";
import { speechListeningName, speechNetworkCopy } from "../src/views/speech-input";
import type { PlannerSnapshot } from "../src/flow/planner-snapshot";

const today = "2026-10-08";
const withEmail =
  "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00. Email planner@northwind.example.";
const withoutEmail = "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00.";
const sameDay =
  "City Stockholm. Attendees 25. Start 2026-12-03. End 2026-12-03. Start time 09:00. Language en. Email planner@northwind.example.";
const openStay =
  "City Stockholm. Attendees 25. Start 2026-12-03. Language en. Email planner@northwind.example.";

async function stayWithoutEndDate(): Promise<{
  filings: BriefDraft[];
  client: ProposalesClient;
  snapshot: PlannerSnapshot;
}> {
  const opened = await capture(openStay);
  const brief = { ...opened.snapshot.brief };
  delete brief.endDate;
  return { ...opened, snapshot: { ...opened.snapshot, brief } };
}

function countingClient(): { client: ProposalesClient; filings: BriefDraft[] } {
  const inner = createFixtureClient();
  const filings: BriefDraft[] = [];
  return {
    filings,
    client: {
      readsLiveProposals: inner.readsLiveProposals,
      listCompanies: () => inner.listCompanies(),
      getProposal: (uuid) => inner.getProposal(uuid),
      loadVenueProposals: () => inner.loadVenueProposals(),
      fileBrief: async (brief) => {
        filings.push(brief);
        return inner.fileBrief(brief);
      },
    },
  };
}

async function capture(text: string): Promise<{
  filings: BriefDraft[];
  client: ProposalesClient;
  snapshot: PlannerSnapshot;
}> {
  const watched = countingClient();
  const opening = openingSnapshot(await watched.client.listCompanies());
  const captured = await runViewportAction({
    action: { type: "captureSubmitted", text },
    snapshot: { ...opening, selectedCompanyId: 2 },
    client: watched.client,
    today,
  });
  return { filings: watched.filings, client: watched.client, snapshot: captured.snapshot };
}

function viewOf(snapshot: PlannerSnapshot) {
  return shellViewModel({ snapshot, busy: false, errorText: null, speechAvailable: false });
}

async function speechTurn(text: string): Promise<void> {
  const opened = await capture(withoutEmail);
  const asked = await runViewportAction({
    action: { type: "composerSubmitted", text: "file" },
    snapshot: opened.snapshot,
    client: opened.client,
    today,
  });
  expect(asked.snapshot.fileAsked).toBe(true);
  expect(viewOf(asked.snapshot).inlineAsk?.field).toBe("contactEmail");
  const heard = await runViewportAction({
    action: { type: "composerSubmitted", text },
    snapshot: asked.snapshot,
    client: opened.client,
    today,
  });
  expect(heard.snapshot.filing).toBeNull();
  expect(heard.snapshot.fileAsked).toBe(false);
  const saved = await runViewportAction({
    action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
    snapshot: heard.snapshot,
    client: opened.client,
    today,
  });
  expect(saved.snapshot.filing).toBeNull();
  expect(opened.filings).toHaveLength(0);
}

describe("file intent", () => {
  it("files exactly once when File is pressed", async () => {
    const opened = await capture(withEmail);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: confirmed.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(0);
    expect(fileBriefLabel(viewOf(ranked.snapshot).filed)).toBe("File this brief");
    const filed = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: ranked.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(filed.snapshot.filing?.path).toBe("draft");
    expect(fileBriefLabel(viewOf(filed.snapshot).filed)).toBe("Filed");
    const repeat = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: filed.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(repeat.snapshot.filing).toEqual(filed.snapshot.filing);
  });

  it("files exactly once when file is typed", async () => {
    const opened = await capture(withEmail);
    const filed = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(filed.snapshot.filing).not.toBeNull();
    const repeat = await runViewportAction({
      action: { type: "composerSubmitted", text: "file it" },
      snapshot: filed.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(repeat.snapshot.filing).toEqual(filed.snapshot.filing);
  });

  it("files exactly once when Save follows the email card after File", async () => {
    const opened = await capture(withoutEmail);
    const asked = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(0);
    expect(asked.snapshot.fileAsked).toBe(true);
    expect(viewOf(asked.snapshot).inlineAsk).toEqual({ field: "contactEmail", inputType: "email", label: "Email" });
    expect(fileBriefLabel(viewOf(asked.snapshot).filed)).toBe("File this brief");
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
      snapshot: asked.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(saved.snapshot.brief.contactEmail).toBe("planner@northwind.example");
    expect(saved.snapshot.filing?.path).toBe("draft");
    expect(fileBriefLabel(viewOf(saved.snapshot).filed)).toBe("Filed");
  });

  it("files exactly once when Save follows File after the detail closes", async () => {
    const opened = await capture(withoutEmail);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: confirmed.snapshot,
      client: opened.client,
      today,
    });
    const shown = await runViewportAction({
      action: { type: "rowOpened", venueName: "Harbour House" },
      snapshot: ranked.snapshot,
      client: opened.client,
      today,
    });
    const asked = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: shown.snapshot,
      client: opened.client,
      today,
    });
    expect(asked.snapshot.fileAsked).toBe(true);
    const closed = await runViewportAction({
      action: { type: "rowClosed" },
      snapshot: asked.snapshot,
      client: opened.client,
      today,
    });
    expect(closed.snapshot.fileAsked).toBe(true);
    expect(opened.filings).toHaveLength(0);
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
      snapshot: closed.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(1);
    expect(saved.snapshot.filing?.path).toBe("draft");
  });

  it("shows an end time card and save or skip does not file", async () => {
    const opened = await capture(sameDay);
    expect(viewOf(opened.snapshot).inlineAsk).toEqual({ field: "endTime", inputType: "time", label: "End time" });
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "endTime", value: "17:00" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(0);
    expect(saved.snapshot.brief.endTime).toBe("17:00");
    expect(saved.snapshot.filing).toBeNull();
    expect(fileBriefLabel(viewOf(saved.snapshot).filed)).toBe("File this brief");
    const skipped = await runViewportAction({
      action: { type: "inlineSkipped" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    expect(opened.filings).toHaveLength(0);
    expect(skipped.snapshot.filing).toBeNull();
    expect(skipped.snapshot.notice).toBe(leftUnfiledNote);
    expect(fileBriefLabel(viewOf(skipped.snapshot).filed)).toBe("File this brief");
  });
});

describe("chat actions do not file", () => {
  const cases: { name: string; run: () => Promise<void> }[] = [
    {
      name: "recap Yes",
      run: async () => {
        const opened = await capture(withEmail);
        const confirmed = await runViewportAction({
          action: { type: "briefConfirmed" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(confirmed.snapshot.phase).toBe("favorites");
        expect(confirmed.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "recap Skip",
      run: async () => {
        const opened = await capture(withEmail);
        const confirmed = await runViewportAction({
          action: { type: "briefConfirmed" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        const skipped = await runViewportAction({
          action: { type: "favoritesSubmitted", text: "skip" },
          snapshot: confirmed.snapshot,
          client: opened.client,
          today,
        });
        expect(skipped.snapshot.phase).toBe("results");
        expect(skipped.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "recap Widen the date",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const refined = await runViewportAction({
          action: { type: "composerSubmitted", text: "Widen the date" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(refined.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "recap Fewer people",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const refined = await runViewportAction({
          action: { type: "composerSubmitted", text: "Fewer people" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(refined.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "recap Retry",
      run: async () => {
        const opened = await capture(withEmail);
        const retried = await runViewportAction({
          action: { type: "composerSubmitted", text: withEmail },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(retried.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline email Save",
      run: async () => {
        const opened = await capture(withoutEmail);
        const confirmed = await runViewportAction({
          action: { type: "briefConfirmed" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(viewOf(confirmed.snapshot).inlineAsk?.field).toBe("contactEmail");
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
          snapshot: confirmed.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.brief.contactEmail).toBe("planner@northwind.example");
        expect(saved.snapshot.filing).toBeNull();
        expect(saved.snapshot.fileAsked).toBe(false);
        expect(fileBriefLabel(viewOf(saved.snapshot).filed)).toBe("File this brief");
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline email Skip",
      run: async () => {
        const opened = await capture(withoutEmail);
        const confirmed = await runViewportAction({
          action: { type: "briefConfirmed" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        const skipped = await runViewportAction({
          action: { type: "inlineSkipped" },
          snapshot: confirmed.snapshot,
          client: opened.client,
          today,
        });
        expect(skipped.snapshot.filing).toBeNull();
        expect(skipped.snapshot.notice).toBe(leftUnfiledNote);
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline end date Save",
      run: async () => {
        const opened = await stayWithoutEndDate();
        expect(viewOf(opened.snapshot).inlineAsk).toEqual({ field: "endDate", inputType: "date", label: "End date" });
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "endDate", value: "2026-12-04" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.brief.endDate).toBe("2026-12-04");
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline end date Skip",
      run: async () => {
        const opened = await stayWithoutEndDate();
        expect(viewOf(opened.snapshot).inlineAsk).toEqual({ field: "endDate", inputType: "date", label: "End date" });
        const skipped = await runViewportAction({
          action: { type: "inlineSkipped" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(skipped.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline end time Save",
      run: async () => {
        const opened = await capture(sameDay);
        expect(viewOf(opened.snapshot).inlineAsk?.field).toBe("endTime");
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "endTime", value: "17:00" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.brief.endTime).toBe("17:00");
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "inline end time Skip",
      run: async () => {
        const opened = await capture(sameDay);
        const skipped = await runViewportAction({
          action: { type: "inlineSkipped" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(skipped.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "File then drawer Apply then Save",
      run: async () => {
        const opened = await capture(withoutEmail);
        const asked = await runViewportAction({
          action: { type: "composerSubmitted", text: "file" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(asked.snapshot.fileAsked).toBe(true);
        expect(opened.filings).toHaveLength(0);
        const edited = await runViewportAction({
          action: {
            type: "moreEdited",
            details: { eventTitle: "Harbour day", attendeeCount: "90" },
          },
          snapshot: asked.snapshot,
          client: opened.client,
          today,
        });
        expect(edited.snapshot.brief.eventTitle).toBe("Harbour day");
        expect(edited.snapshot.brief.attendeeCount).toBe(90);
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
          snapshot: edited.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.brief.contactEmail).toBe("planner@northwind.example");
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "File then typed revision then Save",
      run: async () => {
        const opened = await capture(withoutEmail);
        const asked = await runViewportAction({
          action: { type: "composerSubmitted", text: "file" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        const revised = await runViewportAction({
          action: { type: "composerSubmitted", text: "Title Harbour day. Attendees 90." },
          snapshot: asked.snapshot,
          client: opened.client,
          today,
        });
        expect(revised.snapshot.brief.eventTitle).toBe("Harbour day");
        expect(revised.snapshot.brief.attendeeCount).toBe(90);
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
          snapshot: revised.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "File then a new search then Save",
      run: async () => {
        const opened = await capture(withoutEmail);
        const asked = await runViewportAction({
          action: { type: "composerSubmitted", text: "file" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        const searched = await runViewportAction({
          action: { type: "composerSubmitted", text: "City Gothenburg. Attendees 12. Start 2026-06-02." },
          snapshot: asked.snapshot,
          client: opened.client,
          today,
        });
        expect(searched.snapshot.brief.city).toBe("Gothenburg");
        expect(searched.snapshot.brief.attendeeCount).toBe(12);
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
          snapshot: searched.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "please don't file the brief yet",
      run: async () => {
        const opened = await capture(withEmail);
        const refused = await runViewportAction({
          action: { type: "composerSubmitted", text: "please don't file the brief yet" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(refused.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "drawer Apply",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const edited = await runViewportAction({
          action: {
            type: "moreEdited",
            details: { eventTitle: "Harbour day", contactEmail: "planner@northwind.example" },
          },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(edited.snapshot.brief.eventTitle).toBe("Harbour day");
        expect(edited.snapshot.brief.contactEmail).toBe("planner@northwind.example");
        expect(edited.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
        expect(fileBriefLabel(viewOf(edited.snapshot).filed)).toBe("File this brief");
      },
    },
    {
      name: "new-event card",
      run: async () => {
        const opened = await capture(withEmail);
        const filed = await runViewportAction({
          action: { type: "composerSubmitted", text: "file" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(opened.filings).toHaveLength(1);
        const armed = { ...filed.snapshot, fileAsked: true };
        const split = await runViewportAction({
          action: { type: "composerSubmitted", text: "City Gothenburg. Start 2026-06-01." },
          snapshot: armed,
          client: opened.client,
          today,
        });
        expect(split.snapshot.newEvent).not.toBeNull();
        expect(split.snapshot.fileAsked).toBe(false);
        expect(opened.filings).toHaveLength(1);
        const fresh = emptySnapshot(split.snapshot.companies, "", []);
        const searched = await runViewportAction({
          action: {
            type: "captureSubmitted",
            text: "City Gothenburg. Attendees 12. Start 2026-06-01. End 2026-06-01. Start time 09:00. End time 17:00. Email ada@northwind.example. Language en.",
          },
          snapshot: fresh,
          client: opened.client,
          today,
        });
        expect(searched.snapshot.filing).toBeNull();
        expect(searched.snapshot.fileAsked).toBe(false);
        const saved = await runViewportAction({
          action: { type: "inlineAnswered", field: "contactEmail", value: "ada@northwind.example" },
          snapshot: searched.snapshot,
          client: opened.client,
          today,
        });
        expect(saved.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(1);
      },
    },
    {
      name: "mic start",
      run: () => speechTurn(speechListeningName),
    },
    {
      name: "mic stop",
      run: () => speechTurn("not now"),
    },
    {
      name: "mic fallback",
      run: () => speechTurn(speechNetworkCopy),
    },
    {
      name: "typed yes",
      run: () => typedAffirmation("yes"),
    },
    {
      name: "typed ok",
      run: () => typedAffirmation("ok"),
    },
    {
      name: "off-topic",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "What's the weather in Paris tomorrow?" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "follow-up",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const next = await runViewportAction({
          action: { type: "composerSubmitted", text: "I need a place in Gothenburg for 12 people." },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(next.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "refine",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const narrowed = await runViewportAction({
          action: { type: "composerSubmitted", text: "pick only two" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(narrowed.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "greeting hi",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "hi" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "greeting hello",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "hello" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "greeting thanks",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "thanks" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "results ok",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "ok" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "results okay",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "okay" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "results yes",
      run: async () => {
        const ranked = await resultsWithoutFiling();
        const held = await runViewportAction({
          action: { type: "composerSubmitted", text: "yes" },
          snapshot: ranked.snapshot,
          client: ranked.client,
          today,
        });
        expect(held.snapshot.filing).toBeNull();
        expect(ranked.filings).toHaveLength(0);
      },
    },
    {
      name: "typed sure",
      run: async () => {
        const opened = await capture(withEmail);
        const answered = await runViewportAction({
          action: { type: "composerSubmitted", text: "sure" },
          snapshot: opened.snapshot,
          client: opened.client,
          today,
        });
        expect(answered.snapshot.filing).toBeNull();
        expect(opened.filings).toHaveLength(0);
        expect(fileBriefLabel(viewOf(answered.snapshot).filed)).toBe("File this brief");
      },
    },
  ];

  it.each(cases)("$name sends no filing request", async ({ run }) => {
    await run();
  });
});

async function resultsWithoutFiling(): Promise<{
  filings: BriefDraft[];
  client: ProposalesClient;
  snapshot: PlannerSnapshot;
}> {
  const opened = await capture(withEmail);
  const confirmed = await runViewportAction({
    action: { type: "briefConfirmed" },
    snapshot: opened.snapshot,
    client: opened.client,
    today,
  });
  const ranked = await runViewportAction({
    action: { type: "favoritesSubmitted", text: "skip" },
    snapshot: confirmed.snapshot,
    client: opened.client,
    today,
  });
  expect(opened.filings).toHaveLength(0);
  return { filings: opened.filings, client: opened.client, snapshot: ranked.snapshot };
}

async function typedAffirmation(text: string): Promise<void> {
  const opened = await capture(withEmail);
  const confirmed = await runViewportAction({
    action: { type: "composerSubmitted", text },
    snapshot: opened.snapshot,
    client: opened.client,
    today,
  });
  expect(confirmed.snapshot.phase).toBe("favorites");
  expect(confirmed.snapshot.filing).toBeNull();
  expect(opened.filings).toHaveLength(0);
  expect(fileBriefLabel(viewOf(confirmed.snapshot).filed)).toBe("File this brief");
}

describe("a cleared file press", () => {
  it.each(["hi", "pick only two"])("saves nothing after %s", async (text) => {
    const opened = await capture(withoutEmail);
    const confirmed = await runViewportAction({
      action: { type: "briefConfirmed" },
      snapshot: opened.snapshot,
      client: opened.client,
      today,
    });
    const ranked = await runViewportAction({
      action: { type: "favoritesSubmitted", text: "skip" },
      snapshot: confirmed.snapshot,
      client: opened.client,
      today,
    });
    const asked = await runViewportAction({
      action: { type: "composerSubmitted", text: "file" },
      snapshot: ranked.snapshot,
      client: opened.client,
      today,
    });
    expect(asked.snapshot.fileAsked).toBe(true);
    expect(opened.filings).toHaveLength(0);
    const dropped = await runViewportAction({
      action: { type: "composerSubmitted", text },
      snapshot: asked.snapshot,
      client: opened.client,
      today,
    });
    expect(dropped.snapshot.fileAsked).toBe(false);
    expect(opened.filings).toHaveLength(0);
    const saved = await runViewportAction({
      action: { type: "inlineAnswered", field: "contactEmail", value: "planner@northwind.example" },
      snapshot: dropped.snapshot,
      client: opened.client,
      today,
    });
    expect(saved.snapshot.filing).toBeNull();
    expect(opened.filings).toHaveLength(0);
  });
});

describe("filing call sites", () => {
  it("keeps filing intent inside the file intent module", () => {
    const root = path.resolve("src");
    const choke = "proposales/file-with-intent.ts";
    const rules: { label: string; pattern: RegExp; allow: string[] }[] = [
      { label: "tryFile", pattern: /\btryFile\s*\(/, allow: [choke] },
      { label: "fileBrief call", pattern: /\.fileBrief\s*\(/, allow: [choke] },
      { label: "inbox route", pattern: /\/v1\/inbox\//, allow: [choke] },
      { label: "draft file route", pattern: /["'`]\/v3\/proposals["'`]/, allow: [choke] },
      { label: "askedToFile", pattern: /\baskedToFile\s*\(/, allow: [choke] },
      { label: "intent constructor", pattern: /explicit\s*:\s*true/, allow: [choke] },
      {
        label: "attemptFiling",
        pattern: /\battemptFiling\s*\(/,
        allow: ["flow/filing-guard.ts", "flow/viewport-turn.ts", "flow/scripted-turn.ts", "flow/planner-chat.ts"],
      },
      { label: "fileChatBrief", pattern: /\bfileChatBrief\s*\(/, allow: ["flow/planner-chat.ts"] },
    ];
    const hits: string[] = [];
    for (const file of walk(root)) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      const source = readFileSync(file, "utf8");
      for (const rule of rules) {
        if (rule.pattern.test(source) && !rule.allow.includes(rel)) {
          hits.push(`${rel}: ${rule.label}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return walk(full);
    }
    if (!name.endsWith(".ts") && !name.endsWith(".tsx")) {
      return [];
    }
    return [full];
  });
}
