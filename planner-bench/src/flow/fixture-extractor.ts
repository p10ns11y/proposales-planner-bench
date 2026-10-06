import type { PlannerBrief } from "../domain/planner-brief";
import { minorUnits } from "../domain/minor-units";
import type { VenueOffer } from "../domain/venue-offer";

export type TurnIntent = "file" | "addOffers" | "compare" | "update";

export function turnIntent(text: string): TurnIntent {
  const normalised = text.toLowerCase();
  if (normalised.includes("file the brief") || normalised.trim() === "file") {
    return "file";
  }
  if (normalised.includes("add the venue proposals") || normalised.includes("add offers")) {
    return "addOffers";
  }
  if (normalised.includes("compare")) {
    return "compare";
  }
  return "update";
}

export function extractBriefPatch(text: string): PlannerBrief {
  const withoutMeetingRooms = text.replace(/Meeting rooms\s+\d+/gi, "");
  const patch: PlannerBrief = {};
  const title = /Title\s+([^.]+)\./i.exec(text);
  const organisation = /Organisation\s+([^.]+)\./i.exec(text);
  const email = /Email\s+(\S+)/i.exec(text);
  const startDate = /Start\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const endDate = /End\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const attendees = /Attendees\s+(\d+)/i.exec(text);
  const rooms = /(?:^|\s)Rooms\s+(\d+)/i.exec(withoutMeetingRooms);
  const meetingRooms = /Meeting rooms\s+(\d+)/i.exec(text);
  const language = /Language\s+([a-z]{2})\b/i.exec(text);
  const city = /City\s+([^.]+)\./i.exec(text);
  const food = /Food\s+(yes|no)/i.exec(text);
  const budget = /Budget\s+(\d+)/i.exec(text);
  const notes = /Notes\s+(.+)$/i.exec(text);
  if (title?.[1]) {
    patch.eventTitle = title[1].trim();
  }
  if (organisation?.[1]) {
    patch.organisationName = organisation[1].trim();
  }
  if (email?.[1]) {
    patch.contactEmail = email[1].replace(/[.,]+$/g, "");
  }
  if (startDate?.[1]) {
    patch.startDate = startDate[1];
  }
  if (endDate?.[1]) {
    patch.endDate = endDate[1];
  }
  if (attendees?.[1]) {
    patch.attendeeCount = Number(attendees[1]);
  }
  if (rooms?.[1]) {
    patch.roomCount = Number(rooms[1]);
  }
  if (meetingRooms?.[1]) {
    patch.meetingRoomCount = Number(meetingRooms[1]);
  }
  if (language?.[1]) {
    patch.language = language[1].toLowerCase();
  }
  if (city?.[1]) {
    patch.city = city[1].trim();
  }
  if (food?.[1]) {
    patch.foodRequired = food[1].toLowerCase() === "yes";
  }
  if (budget?.[1]) {
    patch.budgetMinor = minorUnits(Number(budget[1]));
  }
  if (notes?.[1]) {
    patch.notes = notes[1].trim();
  }
  return patch;
}

export function extractPastedOffer(text: string): VenueOffer | null {
  const venue = /Venue:\s*([^.]+)\./i.exec(text);
  if (!venue?.[1]) {
    return null;
  }
  const currency = /Currency\s+([A-Za-z]{3})/i.exec(text);
  const rooms = /Rooms\s+(\d+)/i.exec(text);
  const food = /Food\s+(\d+)/i.exec(text);
  const space = /Space\s+(\d+)/i.exec(text);
  const extras = /Extras\s+(\d+)/i.exec(text);
  const expires = /Expires\s+(\d{4}-\d{2}-\d{2})/i.exec(text);
  const roomsMinor = minorUnits(rooms?.[1] ? Number(rooms[1]) : 0);
  const foodAndBeverageMinor = minorUnits(food?.[1] ? Number(food[1]) : 0);
  const spaceMinor = minorUnits(space?.[1] ? Number(space[1]) : 0);
  const extrasMinor = minorUnits(extras?.[1] ? Number(extras[1]) : 0);
  return {
    venueName: venue[1].trim(),
    currency: currency?.[1]?.toUpperCase(),
    expiresAt: expires?.[1] ? `${expires[1]}T00:00:00.000Z` : undefined,
    roomsMinor,
    foodAndBeverageMinor,
    spaceMinor,
    extrasMinor,
    totalMinor: minorUnits(
      roomsMinor.amount + foodAndBeverageMinor.amount + spaceMinor.amount + extrasMinor.amount,
    ),
  };
}
