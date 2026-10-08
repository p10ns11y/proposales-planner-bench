import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { briefAfter, briefFlow, filingAfter, offersAfter, projectBriefFlow, readStage } from "../src/flow/brief-flow";
import type { PlannerBrief } from "../src/domain/planner-brief";
import type { VenueOffer } from "../src/domain/venue-offer";

const fileable: PlannerBrief = {
  contactEmail: "ada@example.com",
  startDate: "2026-12-03",
  endDate: "2026-12-03",
  attendeeCount: 25,
  language: "en",
};

const comparable: PlannerBrief = {
  ...fileable,
  city: "Stockholm",
  startTime: "09:00",
  endTime: "17:00",
};

const offer: VenueOffer = { venueName: "Harbour House", currency: "EUR", totalMinor: { unit: "minor", amount: 100 } };

describe("brief flow", () => {
  it("walks collecting, fileable, filed, and comparing", () => {
    const actor = createActor(briefFlow);
    actor.start();
    expect(actor.getSnapshot().value).toBe("collecting");

    actor.send({ type: "briefUpdated", brief: fileable });
    expect(actor.getSnapshot().value).toBe("fileable");
    expect(actor.getSnapshot().context.brief).toEqual(fileable);

    actor.send({ type: "briefUpdated", brief: {} });
    expect(actor.getSnapshot().value).toBe("collecting");

    actor.send({ type: "briefUpdated", brief: fileable });
    actor.send({ type: "offerAdded", offer });
    expect(actor.getSnapshot().value).toBe("fileable");
    expect(actor.getSnapshot().context.offers).toEqual([offer]);

    actor.send({ type: "briefFiled", filing: { path: "inbox", id: 7 } });
    expect(actor.getSnapshot().value).toBe("filed");
    expect(actor.getSnapshot().context.filing).toEqual({ path: "inbox", id: 7 });

    actor.send({ type: "offerAdded", offer });
    expect(actor.getSnapshot().value).toBe("filed");

    actor.send({ type: "briefUpdated", brief: comparable });
    actor.send({ type: "offerAdded", offer: { ...offer, venueName: "Canal Loft" } });
    expect(actor.getSnapshot().value).toBe("comparing");
    expect(actor.getSnapshot().context.offers).toHaveLength(3);

    actor.send({ type: "briefUpdated", brief: fileable });
    expect(actor.getSnapshot().value).toBe("filed");
    actor.send({ type: "briefUpdated", brief: comparable });
    expect(actor.getSnapshot().value).toBe("filed");
    actor.send({ type: "offerAdded", offer });
    expect(actor.getSnapshot().value).toBe("comparing");
  });

  it("projects filing and offers only after the brief can hold them", () => {
    expect(projectBriefFlow({ brief: {}, filing: { path: "draft", uuid: "u" }, offers: [offer] })).toEqual({
      stage: "collecting",
      offers: [],
      filing: null,
    });
    expect(projectBriefFlow({ brief: fileable, filing: null, offers: [offer] })).toEqual({
      stage: "fileable",
      offers: [],
      filing: null,
    });
    expect(projectBriefFlow({ brief: fileable, filing: { path: "inbox", id: 4 }, offers: [offer] })).toEqual({
      stage: "filed",
      offers: [offer],
      filing: { path: "inbox", id: 4 },
    });
    expect(
      projectBriefFlow({ brief: comparable, filing: { path: "draft", uuid: "abc" }, offers: [offer, offer] }),
    ).toMatchObject({ stage: "comparing", offers: [offer, offer], filing: { path: "draft", uuid: "abc" } });
  });

  it("reads a known stage and leaves unrelated events in place", () => {
    expect(briefFlow.id).toBe("briefFlow");
    expect(readStage("collecting")).toBe("collecting");
    expect(readStage("fileable")).toBe("fileable");
    expect(readStage("filed")).toBe("filed");
    expect(readStage("comparing")).toBe("comparing");
    expect(() => readStage("later")).toThrow("Unexpected brief stage.");
    expect(briefAfter(fileable, { type: "offerAdded", offer })).toBe(fileable);
    expect(briefAfter(fileable, { type: "briefUpdated", brief: comparable })).toEqual(comparable);
    expect(filingAfter({ path: "inbox", id: 3 }, { type: "briefUpdated", brief: fileable })).toEqual({ path: "inbox", id: 3 });
    expect(filingAfter(null, { type: "briefFiled", filing: { path: "draft", uuid: "abc" } })).toEqual({
      path: "draft",
      uuid: "abc",
    });
    expect(offersAfter([offer], { type: "briefUpdated", brief: fileable })).toEqual([offer]);
    expect(offersAfter([], { type: "offerAdded", offer })).toEqual([offer]);
  });
});
