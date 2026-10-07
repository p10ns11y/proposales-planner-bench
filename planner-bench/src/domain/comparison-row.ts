import { z } from "zod";
import { minorUnitsSchema } from "../domain/minor-units";

export const offerBlockSchema = z.object({
  title: z.string(),
  quantity: z.number(),
});

export type OfferBlock = z.infer<typeof offerBlockSchema>;

export const comparisonRowSchema = z.object({
  venueName: z.string(),
  proposalUuid: z.string().optional(),
  currency: z.string(),
  roomsMinor: minorUnitsSchema,
  foodAndBeverageMinor: minorUnitsSchema,
  spaceMinor: minorUnitsSchema,
  extrasMinor: minorUnitsSchema,
  totalMinor: minorUnitsSchema,
  expiresAt: z.string().optional(),
  gaps: z.array(z.string()),
  neutral: z.array(z.string()).optional(),
  favorite: z.boolean(),
  heldByCompanyName: z.string().optional(),
  blocks: z.array(offerBlockSchema).optional(),
});

export type ComparisonRow = z.infer<typeof comparisonRowSchema>;
