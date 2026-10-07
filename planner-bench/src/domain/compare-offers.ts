import { findBriefGaps, findOfferGaps } from "./fitness";
import type { ComparisonRow } from "./comparison-row";
import { minorUnits } from "./minor-units";
import type { PlannerBrief } from "./planner-brief";
import { stayNeedsRooms } from "./planner-brief";
import type { VenueOffer } from "./venue-offer";

export type { ComparisonRow } from "./comparison-row";

export type CompanyNameLookup = {
  id: number;
  name: string;
};

export function compareOffers(
  brief: PlannerBrief,
  offers: VenueOffer[],
  today: string,
  options: {
    favoriteVenueNames?: string[];
    companies?: CompanyNameLookup[];
  } = {},
): ComparisonRow[] {
  const favoriteVenueNames = options.favoriteVenueNames ?? [];
  const companies = options.companies ?? [];
  return offers.map((offer) =>
    comparisonRow(brief, offer, today, favoriteVenueNames, companies),
  );
}

export function rankComparisonRows(rows: ComparisonRow[], referenceCurrency?: string): ComparisonRow[] {
  const home = homeCurrency(rows, referenceCurrency);
  return [...rows].sort((left, right) => compareRankedRows(left, right, home));
}

function compareRankedRows(left: ComparisonRow, right: ComparisonRow, home: string): number {
  if (left.gaps.length !== right.gaps.length) {
    return left.gaps.length - right.gaps.length;
  }
  const leftHome = currencyMatches(left.currency, home);
  const rightHome = currencyMatches(right.currency, home);
  if (leftHome !== rightHome) {
    return leftHome ? -1 : 1;
  }
  const leftCurrency = normaliseCurrency(left.currency);
  const rightCurrency = normaliseCurrency(right.currency);
  if (leftCurrency !== rightCurrency) {
    return leftCurrency < rightCurrency ? -1 : 1;
  }
  return left.totalMinor.amount - right.totalMinor.amount;
}

function homeCurrency(rows: ComparisonRow[], referenceCurrency: string | undefined): string {
  const stated = normaliseCurrency(referenceCurrency);
  if (stated !== "") {
    return stated;
  }
  const counts = new Map<string, number>();
  const pool = rows.some((row) => !row.gaps.includes("expired"))
    ? rows.filter((row) => !row.gaps.includes("expired"))
    : rows;
  for (const row of pool) {
    const currency = normaliseCurrency(row.currency);
    if (currency === "") {
      continue;
    }
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  let home = "";
  let best = 0;
  for (const [currency, count] of counts) {
    if (count > best || (count === best && (home === "" || currency < home))) {
      home = currency;
      best = count;
    }
  }
  return home;
}

function currencyMatches(currency: string, home: string): boolean {
  return home !== "" && normaliseCurrency(currency) === home;
}

function normaliseCurrency(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function comparisonRow(
  brief: PlannerBrief,
  offer: VenueOffer,
  today: string,
  favoriteVenueNames: string[],
  companies: CompanyNameLookup[],
): ComparisonRow {
  const venueName = offer.venueName ?? "";
  return {
    venueName,
    proposalUuid: offer.proposalUuid,
    currency: offer.currency ?? "",
    roomsMinor: offer.roomsMinor ?? minorUnits(0),
    foodAndBeverageMinor: offer.foodAndBeverageMinor ?? minorUnits(0),
    spaceMinor: offer.spaceMinor ?? minorUnits(0),
    extrasMinor: offer.extrasMinor ?? minorUnits(0),
    totalMinor: offer.totalMinor ?? minorUnits(0),
    expiresAt: offer.expiresAt,
    gaps: comparisonGaps(brief, offer, today),
    favorite: favoriteVenueNames.some(
      (favoriteName) => favoriteName.toLowerCase() === venueName.toLowerCase(),
    ),
    heldByCompanyName: heldByCompanyName(offer, companies, venueName),
    blocks: offer.blocks ?? [],
  };
}

function heldByCompanyName(
  offer: VenueOffer,
  companies: CompanyNameLookup[],
  venueName: string,
): string | undefined {
  if (offer.companyId === undefined || companies.length < 2) {
    return undefined;
  }
  const company = companies.find((item) => item.id === offer.companyId);
  if (company === undefined || company.name === venueName) {
    return undefined;
  }
  return company.name;
}

export function comparisonGaps(brief: PlannerBrief, offer: VenueOffer, today: string): string[] {
  const gaps = [...findOfferGaps(offer)];
  if (stayNeedsRooms(brief) && (offer.roomsMinor?.amount ?? 0) === 0) {
    gaps.push("rooms");
  }
  if (brief.foodRequired === true && (offer.foodAndBeverageMinor?.amount ?? 0) === 0) {
    gaps.push("foodAndBeverage");
  }
  if ((brief.meetingRoomCount ?? 0) > 0 && (offer.spaceMinor?.amount ?? 0) === 0) {
    gaps.push("space");
  }
  if (offer.expiresAt !== undefined && offer.expiresAt.slice(0, 10) < today) {
    gaps.push("expired");
  }
  const neededBreakout = brief.breakoutRoomCount ?? 0;
  if (neededBreakout > 0 && (offer.breakoutRoomCount ?? 0) < neededBreakout) {
    gaps.push("breakout");
  }
  const coveredDiets = new Set((offer.dietaryNeeds ?? []).map((need) => need.trim().toLowerCase()));
  for (const need of brief.foodRequest?.dietaryNeeds ?? []) {
    if (!coveredDiets.has(need.trim().toLowerCase())) {
      gaps.push(need);
    }
  }
  if (offerExceedsBudget(brief, offer)) {
    gaps.push("budget");
  }
  return gaps;
}

function offerExceedsBudget(brief: PlannerBrief, offer: VenueOffer): boolean {
  const total = offer.totalMinor?.amount;
  if (total === undefined) {
    return false;
  }
  if (brief.budget !== undefined) {
    const ceiling = budgetCeilingMinor(brief.budget, brief.attendeeCount);
    if (ceiling === undefined) {
      return false;
    }
    const offerCurrency = offer.currency?.trim().toUpperCase();
    if (offerCurrency === undefined || offerCurrency === "") {
      return false;
    }
    if (offerCurrency !== brief.budget.currency.trim().toUpperCase()) {
      return false;
    }
    return total > ceiling;
  }
  if (brief.budgetMinor !== undefined) {
    return total > brief.budgetMinor.amount;
  }
  return false;
}

function budgetCeilingMinor(
  budget: NonNullable<PlannerBrief["budget"]>,
  attendeeCount: number | undefined,
): number | undefined {
  const unitMinor = Math.round(budget.amount * 100);
  if (budget.scope === "per-person") {
    if (attendeeCount === undefined || attendeeCount <= 0) {
      return undefined;
    }
    return unitMinor * attendeeCount;
  }
  return unitMinor;
}

export function briefGapsForStage(
  brief: PlannerBrief,
  stage: "collecting" | "fileable" | "filed" | "comparing",
): string[] {
  if (stage === "collecting" || stage === "fileable") {
    return findBriefGaps(brief, "brief:fileable");
  }
  return findBriefGaps(brief, "brief:comparable");
}

export function offersForBrief(brief: PlannerBrief, offers: VenueOffer[]): VenueOffer[] {
  return offersMatchingCity(brief, offers).filter((offer) => capacityAllows(brief, offer));
}

export function offersMatchingCity(brief: PlannerBrief, offers: VenueOffer[]): VenueOffer[] {
  return offers.filter((offer) => citiesAgree(brief, offer));
}

function citiesAgree(brief: PlannerBrief, offer: VenueOffer): boolean {
  const briefCity = brief.city?.trim().toLowerCase() ?? "";
  const offerCity = offer.city?.trim().toLowerCase() ?? "";
  if (briefCity === "" || offerCity === "") {
    return true;
  }
  return briefCity === offerCity;
}

function capacityAllows(brief: PlannerBrief, offer: VenueOffer): boolean {
  const attendees = brief.attendeeCount;
  if (attendees === undefined) {
    return true;
  }
  if (offer.minCapacity !== undefined && attendees < offer.minCapacity) {
    return false;
  }
  if (offer.capacity !== undefined && attendees > offer.capacity) {
    return false;
  }
  return true;
}
