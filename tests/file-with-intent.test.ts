import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filingFingerprint } from "../src/flow/filing-guard";
import { openingSnapshot } from "../src/flow/chat-request";
import { emptySnapshot } from "../src/flow/planner-snapshot";
import { leftUnfiledNote } from "../src/flow/inline-ask";
import { runViewportAction } from "../src/flow/viewport-turn";
import { createFixtureClient } from "../src/proposales/fixture-client";
import type { BriefDraft, ProposalesClient } from "../src/proposales/types";
import { shellViewModel } from "../src/view-models/selectors";
import { fileBriefLabel } from "../src/views/file-brief-state";
import {
  recognitionIdle,
  speechNetworkCopy,
  startSpeechCapture,
  stepRecognition,
  stopSpeechCapture,
  type SpeechListener,
} from "../src/views/speech-input";
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

const quietListener: SpeechListener = {
  onTranscript: () => undefined,
  onSignal: () => undefined,
};

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
        const armed = {
          ...opened.snapshot,
          filing: { path: "draft" as const, uuid: "00000000-0000-4000-8000-000000000009" },
          filingKey: filingFingerprint(opened.snapshot.brief),
          phase: "results" as const,
        };
        const split = await runViewportAction({
          action: { type: "composerSubmitted", text: "City Gothenburg. Start 2026-06-01." },
          snapshot: armed,
          client: opened.client,
          today,
        });
        expect(split.snapshot.newEvent).not.toBeNull();
        expect(opened.filings).toHaveLength(0);
        const fresh = emptySnapshot(await opened.client.listCompanies(), "", []);
        expect(fresh.filing).toBeNull();
        expect(fresh.fileAsked).toBe(false);
        expect(opened.filings).toHaveLength(0);
      },
    },
    {
      name: "mic start",
      run: async () => {
        const watched = countingClient();
        startSpeechCapture(quietListener);
        expect(watched.filings).toHaveLength(0);
      },
    },
    {
      name: "mic stop",
      run: async () => {
        const watched = countingClient();
        stopSpeechCapture(
          { lang: "en-US", onresult: null, onerror: null, onend: null, start() {}, stop() {} },
          quietListener,
        );
        expect(watched.filings).toHaveLength(0);
      },
    },
    {
      name: "mic fallback",
      run: async () => {
        const watched = countingClient();
        const next = stepRecognition(recognitionIdle, { type: "errored", code: "network" });
        expect(next.status).toBe(speechNetworkCopy);
        expect(watched.filings).toHaveLength(0);
      },
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

describe("filing call sites", () => {
  it("keeps tryFile, the inbox client, and the file route inside the file intent module", () => {
    const root = path.resolve("src");
    const allowed = path.normalize(path.join(root, "proposales/file-with-intent.ts"));
    const rules = [
      { label: "tryFile", pattern: /\btryFile\s*\(/ },
      { label: "fileBrief call", pattern: /\.fileBrief\s*\(/ },
      { label: "inbox route", pattern: /\/v1\/inbox\// },
      { label: "draft file route", pattern: /["'`]\/v3\/proposals["'`]/ },
    ];
    const hits: string[] = [];
    for (const file of walk(root)) {
      if (path.normalize(file) === allowed) {
        continue;
      }
      const source = readFileSync(file, "utf8");
      for (const rule of rules) {
        if (rule.pattern.test(source)) {
          hits.push(`${path.relative(root, file)}: ${rule.label}`);
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
