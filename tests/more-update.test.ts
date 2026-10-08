import { describe, expect, it } from "vitest";
import { moreUpdateLine } from "../src/views/more-update";

describe("more update line", () => {
  it("says nothing changed when no field is present", () => {
    expect(moreUpdateLine({})).toBe("Nothing changed");
  });

  it("names a text field, or says it was cleared", () => {
    expect(moreUpdateLine({ eventTitle: "Harbour day" })).toBe("Updated: Harbour day");
    expect(moreUpdateLine({ eventTitle: "" })).toBe("Updated: event name cleared");
    expect(moreUpdateLine({ organisationName: "Northwind" })).toBe("Updated: Northwind");
    expect(moreUpdateLine({ organisationName: "" })).toBe("Updated: organisation cleared");
    expect(moreUpdateLine({ contactEmail: "desk" })).toBe("Updated: desk");
    expect(moreUpdateLine({ contactEmail: "" })).toBe("Updated: email cleared");
  });

  it("names the language, or says it was cleared", () => {
    expect(moreUpdateLine({ language: "en" })).toBe("Updated: language en");
    expect(moreUpdateLine({ language: "sv" })).toBe("Updated: language sv");
    expect(moreUpdateLine({ language: "" })).toBe("Updated: language cleared");
  });

  it("counts guests, rooms, and meeting rooms, including one and a cleared value", () => {
    expect(moreUpdateLine({ attendeeCount: "1" })).toBe("Updated: 1 guest");
    expect(moreUpdateLine({ attendeeCount: "30" })).toBe("Updated: 30 guests");
    expect(moreUpdateLine({ attendeeCount: "" })).toBe("Updated: guests cleared");
    expect(moreUpdateLine({ roomCount: "1" })).toBe("Updated: 1 room");
    expect(moreUpdateLine({ roomCount: "4" })).toBe("Updated: 4 rooms");
    expect(moreUpdateLine({ roomCount: "" })).toBe("Updated: rooms cleared");
    expect(moreUpdateLine({ meetingRoomCount: "1" })).toBe("Updated: 1 meeting room");
    expect(moreUpdateLine({ meetingRoomCount: "2" })).toBe("Updated: 2 meeting rooms");
    expect(moreUpdateLine({ meetingRoomCount: "" })).toBe("Updated: meeting rooms cleared");
  });

  it("joins the guest count with meeting rooms", () => {
    expect(moreUpdateLine({ attendeeCount: "30", meetingRoomCount: "2" })).toBe(
      "Updated: 30 guests, 2 meeting rooms",
    );
  });

  it("says whether food, notes, and budget changed or cleared", () => {
    expect(moreUpdateLine({ foodRequired: "yes" })).toBe("Updated: food on");
    expect(moreUpdateLine({ foodRequired: "no" })).toBe("Updated: food off");
    expect(moreUpdateLine({ foodRequired: "" })).toBe("Updated: food cleared");
    expect(moreUpdateLine({ notes: "Vegetarian lunch" })).toBe("Updated: notes updated");
    expect(moreUpdateLine({ notes: "" })).toBe("Updated: notes cleared");
    expect(moreUpdateLine({ budget: "2500" })).toBe("Updated: budget 2500");
    expect(moreUpdateLine({ budget: "" })).toBe("Updated: budget cleared");
  });
});
