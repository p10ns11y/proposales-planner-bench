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

export function rankComparisonRows(rows: ComparisonRow[]): ComparisonRow[] {
  return [...rows].sort((left, right) => {
    if (left.gaps.length !== right.gaps.length) {
      return left.gaps.length - right.gaps.length;
    }
    return left.totalMinor.amount - right.totalMinor.amount;
  });
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
  return gaps;
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

export function offersMatchingCity(brief: PlannerBrief, offers: VenueOffer[]): VenueOffer[] {
  const city = brief.city?.trim().toLowerCase();
  if (city === undefined || city === "") {
    return offers;
  }
  const offersWithCity = offers.filter(
    (offer) => offer.city !== undefined && offer.city.trim() !== "",
  );
  if (offersWithCity.length === 0) {
    return offers;
  }
  return offersWithCity.filter(
    (offer) => offer.city !== undefined && offer.city.trim().toLowerCase() === city,
  );
}
