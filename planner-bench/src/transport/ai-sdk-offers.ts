import type { UIMessage } from "ai";
import { offerGroupPartSchema, type OfferGroupPart } from "../contract/offer-group";

export const offerPartType = "data-offer-group";

export type OfferDataPart = {
  type: typeof offerPartType;
  id?: string;
  data: OfferGroupPart;
};

export function toOfferDataPart(group: OfferGroupPart): OfferDataPart {
  return { type: offerPartType, id: "offer-group", data: group };
}

export function offerGroupFromPart(part: { type: string; data?: unknown }): OfferGroupPart | null {
  if (part.type !== offerPartType) {
    return null;
  }
  const parsed = offerGroupPartSchema.safeParse(part.data);
  return parsed.success ? parsed.data : null;
}

export function offerGroupFromMessage(message: {
  parts: readonly { type: string; data?: unknown }[];
}): OfferGroupPart | null {
  for (const part of message.parts) {
    const group = offerGroupFromPart(part);
    if (group !== null) {
      return group;
    }
  }
  return null;
}

export function offerGroupFromUiMessage(message: UIMessage): OfferGroupPart | null {
  return offerGroupFromMessage(message);
}
