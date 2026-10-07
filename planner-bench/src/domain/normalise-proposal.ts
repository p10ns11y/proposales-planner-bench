import { z } from "zod";
import { addMinorUnits, minorUnits } from "./minor-units";
import type { DayPart } from "./planner-brief";
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
  currency: z.string().optional(),
  expires_at: z.number().nullable().optional(),
  data: z.unknown().optional(),
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
  const venueName = venueNameFromTitle(parsed.title);
  const facts = readProposalData(parsed.data);

  return {
    venueName,
    proposalUuid: parsed.uuid,
    companyId: parsed.company_id,
    ...facts,
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

const dayPartAliases: Record<string, DayPart> = {
  "full-day": "full-day",
  "all-day": "all-day",
  "half-day": "half-day",
  morning: "morning",
  afternoon: "afternoon",
};

function readProposalData(data: unknown): Pick<VenueOffer, "city" | "capacity" | "dayPart"> {
  if (typeof data !== "object" || data === null) {
    return {};
  }
  const record = data as Record<string, unknown>;
  const city = readCity(record.city);
  const capacity = readCapacity(record.capacity);
  const dayPart = readDayPart(record.day_part);
  return {
    ...(city !== undefined ? { city } : {}),
    ...(capacity !== undefined ? { capacity } : {}),
    ...(dayPart !== undefined ? { dayPart } : {}),
  };
}

function readCity(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const city = value.trim();
  return city === "" ? undefined : city;
}

function readCapacity(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 1) {
    return undefined;
  }
  return numeric;
}

function readDayPart(value: unknown): DayPart | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const key = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return dayPartAliases[key];
}

const demoVenueSuffix = " (demo venue)";

function venueNameFromTitle(title: string | null | undefined): string {
  if (title === undefined || title === null) {
    return "Untitled venue";
  }
  const stripped = title.endsWith(demoVenueSuffix) ? title.slice(0, -demoVenueSuffix.length) : title;
  const trimmed = stripped.trim();
  return trimmed === "" ? "Untitled venue" : trimmed;
}
