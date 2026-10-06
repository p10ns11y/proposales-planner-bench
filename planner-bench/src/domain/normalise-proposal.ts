import { z } from "zod";
import { addMinorUnits, minorUnits } from "./minor-units";
import type { VenueOffer } from "./venue-offer";

const packageSplitTypeSchema = z.enum(["accommodation", "meetingRoom", "food", "other"]);

const bucketByPackageSplitType = {
  accommodation: "roomsMinor",
  food: "foodAndBeverageMinor",
  meetingRoom: "spaceMinor",
  other: "extrasMinor",
} as const;

type OfferBucket = (typeof bucketByPackageSplitType)[keyof typeof bucketByPackageSplitType];

const proposalForOfferSchema = z.object({
  uuid: z.string(),
  title: z.string().nullable().optional(),
  company_id: z.number().int().optional(),
  company_name: z.string().optional(),
  currency: z.string().optional(),
  expires_at: z.number().nullable().optional(),
  blocks: z.array(
    z.object({
      quantity: z.number().optional(),
      package_split: z
        .array(
          z.object({
            type: packageSplitTypeSchema,
            value_without_tax: z.number().optional(),
            value_with_tax: z.number().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export function normaliseProposal(proposal: unknown): VenueOffer {
  const parsed = proposalForOfferSchema.parse(proposal);
  const totals: Record<OfferBucket, number> = {
    roomsMinor: 0,
    foodAndBeverageMinor: 0,
    spaceMinor: 0,
    extrasMinor: 0,
  };

  for (const block of parsed.blocks) {
    const quantity = block.quantity === undefined ? 1 : block.quantity;
    for (const split of block.package_split ?? []) {
      const unitAmount = split.value_without_tax ?? split.value_with_tax ?? 0;
      const bucket = bucketByPackageSplitType[split.type];
      totals[bucket] += unitAmount * quantity;
    }
  }

  const roomsMinor = minorUnits(Math.round(totals.roomsMinor));
  const foodAndBeverageMinor = minorUnits(Math.round(totals.foodAndBeverageMinor));
  const spaceMinor = minorUnits(Math.round(totals.spaceMinor));
  const extrasMinor = minorUnits(Math.round(totals.extrasMinor));
  const venueName = nonEmptyTitle(parsed.title) ?? parsed.company_name ?? "Untitled venue";

  return {
    venueName,
    proposalUuid: parsed.uuid,
    companyId: parsed.company_id,
    currency: parsed.currency,
    expiresAt:
      parsed.expires_at === undefined || parsed.expires_at === null
        ? undefined
        : new Date(parsed.expires_at * 1000).toISOString(),
    roomsMinor,
    foodAndBeverageMinor,
    spaceMinor,
    extrasMinor,
    totalMinor: addMinorUnits([roomsMinor, foodAndBeverageMinor, spaceMinor, extrasMinor]),
  };
}

function nonEmptyTitle(title: string | null | undefined): string | undefined {
  if (title === undefined || title === null || title === "") {
    return undefined;
  }
  return title;
}
