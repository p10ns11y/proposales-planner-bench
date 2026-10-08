import { z } from "zod";

export const minorUnitsSchema = z.object({
  unit: z.literal("minor"),
  amount: z.number().int(),
});

export type MinorUnits = z.infer<typeof minorUnitsSchema>;

export function minorUnits(amount: number): MinorUnits {
  return minorUnitsSchema.parse({ unit: "minor", amount });
}

export function formatBudgetMajor(amount: number): string {
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const major = Math.floor(absolute / 100);
  const minor = absolute % 100;
  const body = minor === 0 ? String(major) : `${major}.${String(minor).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function minorFromBudgetMajor(value: string): number | undefined {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim().replace(/,/g, ""));
  if (match === null) {
    return undefined;
  }
  const whole = Number(match[2]);
  const fraction = Number((match[3] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents)) {
    return undefined;
  }
  return match[1] === "-" ? -cents : cents;
}

export function addMinorUnits(values: MinorUnits[]): MinorUnits {
  const amount = values.reduce((total, value) => total + value.amount, 0);
  return minorUnits(amount);
}
