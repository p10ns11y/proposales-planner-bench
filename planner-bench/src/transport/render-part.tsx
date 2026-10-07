"use client";

import type { ReactNode } from "react";
import { offerGroupFromPart } from "./ai-sdk-offers";
import { OfferGroupCard } from "../views/offer-group";

export function renderPart(
  part: { type: string; data?: unknown },
  props: {
    hiddenCount: number;
    openName: string | null;
    onOpen: (venueName: string) => void;
    onShowMore: () => void;
  },
): ReactNode {
  if (part.type === "data-offer-group") {
    const group = offerGroupFromPart(part);
    if (group === null) {
      return null;
    }
    return (
      <OfferGroupCard
        group={group}
        hiddenCount={props.hiddenCount}
        openName={props.openName}
        onOpen={props.onOpen}
        onShowMore={props.onShowMore}
      />
    );
  }
  return null;
}
