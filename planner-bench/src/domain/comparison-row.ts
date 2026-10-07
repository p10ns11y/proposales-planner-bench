import { z } from "zod";
import { minorUnitsSchema } from "../domain/minor-units";

export const comparisonRowSchema = z.object({
  venueName: z.string(),
  currency: z.string(),
  roomsMinor: minorUnitsSchema,
  foodAndBeverageMinor: minorUnitsSchema,
  spaceMinor: minorUnitsSchema,
  extrasMinor: minorUnitsSchema,
  totalMinor: minorUnitsSchema,
  expiresAt: z.string().optional(),
  gaps: z.array(z.string()),
  favorite: z.boolean(),
  heldByCompanyName: z.string().optional(),
});

export type ComparisonRow = z.infer<typeof comparisonRowSchema>;
