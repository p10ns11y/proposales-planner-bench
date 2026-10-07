import { z } from "zod";
import { offerBlockSchema } from "./comparison-row";
import { minorUnitsSchema } from "./minor-units";

export const venueOfferSchema = z.object({
  venueName: z.string().optional(),
  proposalUuid: z.string().optional(),
  companyId: z.number().int().optional(),
  city: z.string().optional(),
  currency: z.string().optional(),
  expiresAt: z.string().optional(),
  roomsMinor: minorUnitsSchema.optional(),
  foodAndBeverageMinor: minorUnitsSchema.optional(),
  spaceMinor: minorUnitsSchema.optional(),
  extrasMinor: minorUnitsSchema.optional(),
  totalMinor: minorUnitsSchema.optional(),
  blocks: z.array(offerBlockSchema).optional(),
});

export type VenueOffer = z.infer<typeof venueOfferSchema>;
