import { z } from "zod";

export const minorUnitsSchema = z.object({
  unit: z.literal("minor"),
  amount: z.number().int(),
});

export type MinorUnits = z.infer<typeof minorUnitsSchema>;

export function minorUnits(amount: number): MinorUnits {
  return minorUnitsSchema.parse({ unit: "minor", amount });
}

export function addMinorUnits(values: MinorUnits[]): MinorUnits {
  const amount = values.reduce((total, value) => total + value.amount, 0);
  return minorUnits(amount);
}
