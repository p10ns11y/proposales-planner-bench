import { z } from "zod";
import { offerBlockSchema } from "./comparison-row";
import { minorUnitsSchema } from "./minor-units";

export const offerDayPartSchema = z.enum([
  "full_day",
  "half_day_morning",
  "half_day_afternoon",
  "evening",
  "overnight",
  "multi_day",
]);

export const venueOfferSchema = z.object({
  venueName: z.string().optional(),
  proposalUuid: z.string().optional(),
  companyId: z.number().int().optional(),
  city: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  minCapacity: z.number().int().positive().optional(),
  dayPart: offerDayPartSchema.optional(),
  eventType: z.string().min(1).optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  expiresAt: z.string().optional(),
  roomsMinor: minorUnitsSchema.optional(),
  foodAndBeverageMinor: minorUnitsSchema.optional(),
  spaceMinor: minorUnitsSchema.optional(),
  extrasMinor: minorUnitsSchema.optional(),
  totalMinor: minorUnitsSchema.optional(),
  breakoutRoomCount: z.number().int().nonnegative().optional(),
  dietaryNeeds: z.array(z.string()).optional(),
  blocks: z.array(offerBlockSchema).optional(),
});

export type VenueOffer = z.infer<typeof venueOfferSchema>;
