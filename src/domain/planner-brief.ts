import { z } from "zod";
import { applyDayPartClock, dayPartNames } from "./day-part";
import { minorUnitsSchema } from "./minor-units";

export { assumedSpan } from "./day-part";
export type { DayPart } from "./day-part";

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const mealKindSchema = z.enum(["breakfast", "lunch", "dinner"]);

export const foodRequestSchema = z.object({
  meal: mealKindSchema.optional(),
  dietaryNeeds: z.array(z.string().min(1)).optional(),
});

export const budgetScopeSchema = z.enum(["total", "per-person"]);

export const briefBudgetSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Za-z]{3}$/),
  scope: budgetScopeSchema.optional(),
  approximate: z.boolean().optional(),
});

export const dayPartSchema = z.enum(dayPartNames);

export const timeAssumptionSchema = z.object({
  dayPart: dayPartSchema,
  statement: z.string().min(1),
});

export const plannerBriefSchema = z.object({
  eventTitle: z.string().optional(),
  contactEmail: z.string().optional(),
  organisationName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  attendeeCount: z.number().int().nonnegative().optional(),
  roomCount: z.number().int().nonnegative().optional(),
  meetingRoomCount: z.number().int().nonnegative().optional(),
  breakoutRoomCount: z.number().int().positive().optional(),
  foodRequired: z.boolean().optional(),
  foodRequest: foodRequestSchema.optional(),
  city: z.string().optional(),
  budgetMinor: minorUnitsSchema.optional(),
  budget: briefBudgetSchema.optional(),
  notes: z.string().optional(),
  language: z.string().optional(),
  startTime: clockTimeSchema.optional(),
  endTime: clockTimeSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  timeAssumption: timeAssumptionSchema.optional(),
});

export type PlannerBrief = z.infer<typeof plannerBriefSchema>;

const dietAliases: Record<string, string> = {
  vegetarian: "vegetarian",
  vegan: "vegan",
  "gluten-free": "gluten-free",
  glutenfree: "gluten-free",
  "gluten free": "gluten-free",
  celiac: "gluten-free",
  coeliac: "gluten-free",
  "dairy-free": "dairy-free",
  dairyfree: "dairy-free",
  "dairy free": "dairy-free",
  "nut-free": "nut-free",
  nutfree: "nut-free",
  "nut free": "nut-free",
  "nut allergy": "nut-free",
  halal: "halal",
  kosher: "kosher",
  pescatarian: "pescatarian",
};

export function stayNeedsRooms(brief: PlannerBrief): boolean {
  if (brief.startDate === undefined || brief.endDate === undefined) {
    return false;
  }
  return brief.endDate > brief.startDate;
}

export function budgetNeedsBasis(brief: PlannerBrief): boolean {
  return brief.budget !== undefined && brief.budget.scope === undefined;
}

export function mergeBrief(current: PlannerBrief, patch: PlannerBrief): PlannerBrief {
  const foodRequest = mergeFoodRequest(current.foodRequest, patch.foodRequest);
  const schedule = mergeSchedule(current, patch);
  let foodRequired = patch.foodRequired ?? current.foodRequired;
  if (foodRequired === undefined && foodRequest !== undefined) {
    foodRequired = true;
  }
  return applyDayPartClock(
    plannerBriefSchema.parse({
      eventTitle: patch.eventTitle ?? current.eventTitle,
      contactEmail: patch.contactEmail ?? current.contactEmail,
      organisationName: patch.organisationName ?? current.organisationName,
      startDate: patch.startDate ?? current.startDate,
      endDate: patch.endDate ?? current.endDate,
      attendeeCount: patch.attendeeCount ?? current.attendeeCount,
      roomCount: patch.roomCount ?? current.roomCount,
      meetingRoomCount: patch.meetingRoomCount ?? current.meetingRoomCount,
      breakoutRoomCount: patch.breakoutRoomCount ?? current.breakoutRoomCount,
      foodRequired,
      foodRequest,
      city: patch.city ?? current.city,
      budgetMinor: patch.budgetMinor ?? current.budgetMinor,
      budget: mergeBudget(current.budget, patch.budget),
      notes: patch.notes ?? current.notes,
      language: patch.language ?? current.language,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      durationMinutes: schedule.durationMinutes,
      timeAssumption: schedule.timeAssumption,
    }),
  );
}

function mergeSchedule(
  current: PlannerBrief,
  patch: PlannerBrief,
): Pick<PlannerBrief, "startTime" | "endTime" | "durationMinutes" | "timeAssumption"> {
  const touchesSchedule =
    patch.startTime !== undefined ||
    patch.endTime !== undefined ||
    patch.durationMinutes !== undefined ||
    patch.timeAssumption !== undefined;
  if (!touchesSchedule) {
    return {
      startTime: current.startTime,
      endTime: current.endTime,
      durationMinutes: current.durationMinutes,
      timeAssumption: current.timeAssumption,
    };
  }
  return {
    startTime: patch.startTime ?? current.startTime,
    endTime: patch.endTime ?? current.endTime,
    durationMinutes: patch.durationMinutes ?? current.durationMinutes,
    timeAssumption: patch.timeAssumption,
  };
}

function mergeFoodRequest(
  current: PlannerBrief["foodRequest"],
  patch: PlannerBrief["foodRequest"],
): PlannerBrief["foodRequest"] {
  if (current === undefined && patch === undefined) {
    return undefined;
  }
  const meal = patch?.meal ?? current?.meal;
  const dietaryNeeds = canonicalDiets(patch?.dietaryNeeds ?? current?.dietaryNeeds);
  if (meal === undefined && dietaryNeeds === undefined) {
    return undefined;
  }
  return {
    ...(meal !== undefined ? { meal } : {}),
    ...(dietaryNeeds !== undefined ? { dietaryNeeds } : {}),
  };
}

function canonicalDiets(values: string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  const unique: string[] = [];
  for (const value of values) {
    const diet = canonicalDiet(value);
    if (diet !== "" && !unique.includes(diet)) {
      unique.push(diet);
    }
  }
  return unique.length === 0 ? undefined : unique;
}

function canonicalDiet(value: string): string {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (key === "") {
    return "";
  }
  return dietAliases[key] ?? key;
}

function mergeBudget(
  current: PlannerBrief["budget"],
  patch: PlannerBrief["budget"],
): PlannerBrief["budget"] {
  if (patch === undefined) {
    return canonicalBudget(current);
  }
  const next = canonicalBudget(patch);
  if (next === undefined) {
    return canonicalBudget(current);
  }
  if (next.scope !== undefined || current?.scope === undefined) {
    return next;
  }
  if (current.amount !== next.amount || current.currency !== next.currency) {
    return next;
  }
  return canonicalBudget({
    amount: next.amount,
    currency: next.currency,
    scope: current.scope,
    ...(next.approximate !== undefined
      ? { approximate: next.approximate }
      : current.approximate !== undefined
        ? { approximate: current.approximate }
        : {}),
  });
}

function canonicalBudget(budget: PlannerBrief["budget"]): PlannerBrief["budget"] {
  if (budget === undefined) {
    return undefined;
  }
  return {
    amount: budget.amount,
    currency: budget.currency.toUpperCase(),
    ...(budget.scope !== undefined ? { scope: budget.scope } : {}),
    ...(budget.approximate !== undefined ? { approximate: budget.approximate } : {}),
  };
}
