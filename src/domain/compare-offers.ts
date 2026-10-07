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
  return offers.map((offer) =>
    comparisonRow(brief, offer, today, favoriteVenueNames, options.companies),
  );
}

export function rankComparisonRows(rows: ComparisonRow[], referenceCurrency?: string): ComparisonRow[] {
  const lead = leadCurrency(rows, referenceCurrency);
  return [...rows].sort((left, right) => compareRankedRows(left, right, lead));
}

function compareRankedRows(left: ComparisonRow, right: ComparisonRow, lead: string): number {
  const leftLead = currencyMatches(left.currency, lead);
  const rightLead = currencyMatches(right.currency, lead);
  if (leftLead !== rightLead) {
    return leftLead ? -1 : 1;
  }
  const currencyOrder = orderText(normaliseCurrency(left.currency), normaliseCurrency(right.currency));
  if (currencyOrder !== 0) {
    return currencyOrder;
  }
  return compareWithinCurrency(left, right);
}

function leadCurrency(rows: ComparisonRow[], referenceCurrency: string | undefined): string {
  const stated = normaliseCurrency(referenceCurrency);
  if (stated !== "") {
    return stated;
  }
  const top = [...rows].sort(compareForLead)[0];
  return normaliseCurrency(top?.currency);
}

function compareForLead(left: ComparisonRow, right: ComparisonRow): number {
  if (left.gaps.length !== right.gaps.length) {
    return left.gaps.length - right.gaps.length;
  }
  return orderText(normaliseCurrency(left.currency), normaliseCurrency(right.currency));
}

function compareWithinCurrency(left: ComparisonRow, right: ComparisonRow): number {
  if (left.gaps.length !== right.gaps.length) {
    return left.gaps.length - right.gaps.length;
  }
  return left.totalMinor.amount - right.totalMinor.amount;
}

function currencyMatches(currency: string, lead: string): boolean {
  return normaliseCurrency(currency) === lead;
}

function normaliseCurrency(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function orderText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (right < left) {
    return 1;
  }
  return 0;
}

function comparisonRow(
  brief: PlannerBrief,
  offer: VenueOffer,
  today: string,
  favoriteVenueNames: string[],
  companies: CompanyNameLookup[] | undefined,
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
    neutral: unstatedOfferMarks(brief),
    favorite: favoriteVenueNames.some(
      (favoriteName) => favoriteName.toLowerCase() === venueName.toLowerCase(),
    ),
    heldByCompanyName: heldByCompanyName(offer, companies, venueName),
    blocks: offer.blocks ?? [],
  };
}

function heldByCompanyName(
  offer: VenueOffer,
  companies: CompanyNameLookup[] | undefined,
  venueName: string,
): string | undefined {
  if (companies === undefined || companies.length < 2) {
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

export function unstatedOfferMarks(brief: PlannerBrief): string[] {
  const marks: string[] = [];
  if (brief.breakoutRoomCount === undefined) {
    marks.push("breakout");
  }
  if ((brief.foodRequest?.dietaryNeeds ?? []).length === 0) {
    marks.push("diet");
  }
  return marks;
}

function offerExceedsBudget(brief: PlannerBrief, offer: VenueOffer): boolean {
  const total = offer.totalMinor?.amount;
  if (brief.budget !== undefined) {
    const ceiling = budgetCeilingMinor(brief.budget, brief.attendeeCount);
    const offerCurrency = offer.currency?.trim().toUpperCase();
    if (offerCurrency === undefined || offerCurrency === "") {
      return false;
    }
    if (offerCurrency !== brief.budget.currency.trim().toUpperCase()) {
      return false;
    }
    return (total as number) > (ceiling as number);
  }
  if (brief.budgetMinor !== undefined) {
    return (total as number) > brief.budgetMinor.amount;
  }
  return false;
}

function budgetCeilingMinor(
  budget: NonNullable<PlannerBrief["budget"]>,
  attendeeCount: number | undefined,
): number | undefined {
  if (budget.scope === undefined) {
    return undefined;
  }
  const unitMinor = Math.round(budget.amount * 100);
  if (budget.scope === "per-person") {
    const headcount = attendeeCount as number;
    if (!(headcount > 0)) {
      return undefined;
    }
    return unitMinor * headcount;
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
  const briefCity = foldCity(brief.city ?? "");
  const offerCity = foldCity(offer.city ?? "");
  if (briefCity === "" || offerCity === "") {
    return true;
  }
  return briefCity === offerCity;
}

function foldCity(value: string): string {
  return value.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function capacityAllows(brief: PlannerBrief, offer: VenueOffer): boolean {
  const attendees = brief.attendeeCount;
  if ((attendees as number) < (offer.minCapacity as number)) {
    return false;
  }
  if ((attendees as number) > (offer.capacity as number)) {
    return false;
  }
  return true;
}
