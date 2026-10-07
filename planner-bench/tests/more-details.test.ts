import { describe, expect, it } from "vitest";
import { plannerBriefSchema } from "../src/domain/planner-brief";
import { applyMoreDetails } from "../src/flow/more-details";

const brief = plannerBriefSchema.parse({
  city: "Stockholm",
  attendeeCount: 40,
  meetingRoomCount: 2,
  foodRequired: true,
  notes: "Dinner in the hall",
});

describe("applyMoreDetails", () => {
  it("leaves fields the save did not mention", () => {
    const next = applyMoreDetails(brief, {
      contactEmail: "planner@northwind.example",
      language: "en",
    });
    expect(next.contactEmail).toBe("planner@northwind.example");
    expect(next.language).toBe("en");
    expect(next.meetingRoomCount).toBe(2);
    expect(next.foodRequired).toBe(true);
    expect(next.notes).toBe("Dinner in the hall");
    expect(next.city).toBe("Stockholm");
    expect(next.attendeeCount).toBe(40);
  });

  it("clears a field when the save sends it empty", () => {
    const next = applyMoreDetails(brief, {
      meetingRoomCount: "",
      foodRequired: "",
    });
    expect(next.meetingRoomCount).toBeUndefined();
    expect(next.foodRequired).toBeUndefined();
    expect(next.notes).toBe("Dinner in the hall");
    expect(next.city).toBe("Stockholm");
    expect(next.attendeeCount).toBe(40);
  });
});
