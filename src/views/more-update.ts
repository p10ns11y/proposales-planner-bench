import type { MoreFieldValues } from "../view-models/view-model";

export function moreUpdateLine(details: Partial<MoreFieldValues>): string {
  const parts = [
    namedPart(details.eventTitle, "event name cleared"),
    namedPart(details.organisationName, "organisation cleared"),
    namedPart(details.contactEmail, "email cleared"),
    languagePart(details.language),
    countPart(details.attendeeCount, "guest", "guests", "guests cleared"),
    countPart(details.roomCount, "room", "rooms", "rooms cleared"),
    countPart(details.meetingRoomCount, "meeting room", "meeting rooms", "meeting rooms cleared"),
    foodPart(details.foodRequired),
    notesPart(details.notes),
    budgetPart(details.budget),
    namedPart(details.city, "city cleared"),
    namedPart(details.startDate, "start date cleared"),
    namedPart(details.endDate, "end date cleared"),
    namedPart(details.startTime, "start time cleared"),
    namedPart(details.endTime, "end time cleared"),
    basisPart(details.budgetBasis),
    namedPart(details.currency, "currency cleared"),
  ].filter(presentPart);
  if (parts.length === 0) {
    return "Nothing changed";
  }
  return `Updated: ${parts.join(", ")}`;
}

function presentPart(part: string | null): part is string {
  return part !== null;
}

function namedPart(value: string | undefined, cleared: string): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return cleared;
  }
  return value;
}

function languagePart(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return "language cleared";
  }
  return `language ${value}`;
}

function countPart(
  value: string | undefined,
  singular: string,
  plural: string,
  cleared: string,
): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return cleared;
  }
  if (value === "1") {
    return `1 ${singular}`;
  }
  return `${value} ${plural}`;
}

function foodPart(value: MoreFieldValues["foodRequired"] | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "yes") {
    return "food on";
  }
  if (value === "no") {
    return "food off";
  }
  return "food cleared";
}

function notesPart(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return "notes cleared";
  }
  return "notes updated";
}

function basisPart(value: MoreFieldValues["budgetBasis"] | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return "budget basis cleared";
  }
  if (value === "per-person") {
    return "budget per person";
  }
  return "budget total";
}

function budgetPart(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value === "") {
    return "budget cleared";
  }
  return `budget ${value}`;
}
