import { findBriefGaps, findOfferGaps } from "./fitness";
import type { ComparisonRow } from "./comparison-row";
import { minorUnits } from "./minor-units";
import type { PlannerBrief } from "./planner-brief";
import { stayNeedsRooms } from "./planner-brief";
import type { VenueOffer } from "./venue-offer";

export type { ComparisonRow } from "./comparison-row";

export function compareOffers(
  brief: PlannerBrief,
  offers: VenueOffer[],
  today: string,
): ComparisonRow[] {
  return offers.map((offer) => comparisonRow(brief, offer, today));
}

function comparisonRow(brief: PlannerBrief, offer: VenueOffer, today: string): ComparisonRow {
  return {
    venueName: offer.venueName ?? "",
    currency: offer.currency ?? "",
    roomsMinor: offer.roomsMinor ?? minorUnits(0),
    foodAndBeverageMinor: offer.foodAndBeverageMinor ?? minorUnits(0),
    spaceMinor: offer.spaceMinor ?? minorUnits(0),
    extrasMinor: offer.extrasMinor ?? minorUnits(0),
    totalMinor: offer.totalMinor ?? minorUnits(0),
    expiresAt: offer.expiresAt,
    gaps: comparisonGaps(brief, offer, today),
  };
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
