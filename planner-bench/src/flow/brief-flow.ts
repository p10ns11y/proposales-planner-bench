import { assign, createActor, setup } from "xstate";
import { findBriefGaps } from "../domain/fitness";
import type { PlannerBrief } from "../domain/planner-brief";
import type { VenueOffer } from "../domain/venue-offer";
import type { FileBriefResult } from "../proposales/types";

export type BriefStage = "collecting" | "fileable" | "filed" | "comparing";

export type BriefFlowContext = {
  brief: PlannerBrief;
  offers: VenueOffer[];
  filing: FileBriefResult | null;
};

export type BriefFlowEvent =
  | { type: "briefUpdated"; brief: PlannerBrief }
  | { type: "briefFiled"; filing: FileBriefResult }
  | { type: "offerAdded"; offer: VenueOffer };

export const briefFlow = setup({
  types: {
    context: {} as BriefFlowContext,
    events: {} as BriefFlowEvent,
  },
  guards: {
    briefIsFileable: ({ context }) => findBriefGaps(context.brief, "brief:fileable").length === 0,
    briefIsNotFileable: ({ context }) => findBriefGaps(context.brief, "brief:fileable").length > 0,
    briefIsComparable: ({ context }) => findBriefGaps(context.brief, "brief:comparable").length === 0,
    briefIsNotComparable: ({ context }) => findBriefGaps(context.brief, "brief:comparable").length > 0,
  },
  actions: {
    replaceBrief: assign({
      brief: ({ context, event }) => (event.type === "briefUpdated" ? event.brief : context.brief),
    }),
    storeFiling: assign({
      filing: ({ context, event }) => (event.type === "briefFiled" ? event.filing : context.filing),
    }),
    appendOffer: assign({
      offers: ({ context, event }) =>
        event.type === "offerAdded" ? [...context.offers, event.offer] : context.offers,
    }),
  },
}).createMachine({
  id: "briefFlow",
  initial: "collecting",
  context: {
    brief: {},
    offers: [],
    filing: null,
  },
  states: {
    collecting: {
      on: {
        briefUpdated: { actions: "replaceBrief" },
      },
      always: [{ guard: "briefIsFileable", target: "fileable" }],
    },
    fileable: {
      on: {
        briefUpdated: { actions: "replaceBrief" },
        briefFiled: { target: "filed", actions: "storeFiling" },
        offerAdded: { actions: "appendOffer" },
      },
      always: [{ guard: "briefIsNotFileable", target: "collecting" }],
    },
    filed: {
      on: {
        briefUpdated: { actions: "replaceBrief" },
        offerAdded: [
          { guard: "briefIsComparable", target: "comparing", actions: "appendOffer" },
          { actions: "appendOffer" },
        ],
      },
    },
    comparing: {
      on: {
        briefUpdated: { actions: "replaceBrief" },
        offerAdded: { actions: "appendOffer" },
      },
      always: [{ guard: "briefIsNotComparable", target: "filed" }],
    },
  },
});

export function projectBriefFlow(input: {
  brief: PlannerBrief;
  filing: FileBriefResult | null;
  offers: VenueOffer[];
}): { stage: BriefStage; offers: VenueOffer[]; filing: FileBriefResult | null } {
  const actor = createActor(briefFlow);
  actor.start();
  actor.send({ type: "briefUpdated", brief: input.brief });
  if (input.filing && actor.getSnapshot().matches("fileable")) {
    actor.send({ type: "briefFiled", filing: input.filing });
  }
  const filedOrComparing =
    actor.getSnapshot().matches("filed") || actor.getSnapshot().matches("comparing");
  if (filedOrComparing) {
    for (const offer of input.offers) {
      actor.send({ type: "offerAdded", offer });
    }
  }
  const snapshot = actor.getSnapshot();
  return {
    stage: readStage(snapshot.value),
    offers: snapshot.context.offers,
    filing: snapshot.context.filing,
  };
}

function readStage(value: unknown): BriefStage {
  if (value === "collecting" || value === "fileable" || value === "filed" || value === "comparing") {
    return value;
  }
  throw new Error("Unexpected brief stage.");
}
