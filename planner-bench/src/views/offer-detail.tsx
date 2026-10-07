"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Calendar, Clock, Copy, MapPin, Share2, Users, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import {
  formatOfferPrice,
  offerBreakdown,
  type OfferPart,
} from "../contract/offer-group";
import { gapLabel } from "./offer-copy";

const detailSpring = { type: "spring" as const, stiffness: 380, damping: 34 };

const sectionTitle: Record<string, string> = {
  rooms: "Rooms",
  foodAndBeverage: "Food and drink",
  space: "Space",
  extras: "Extras",
  other: "Other",
};

type OfferDetailProps = {
  offer: OfferPart | null;
  includeExtras: boolean;
  contextChips: string[];
  confirmation: string | null;
  busy: boolean;
  onClose: () => void;
  onFile: () => void;
};

export function OfferDetail({
  offer,
  includeExtras,
  contextChips,
  confirmation,
  busy,
  onClose,
  onFile,
}: OfferDetailProps) {
  const reduce = useReducedMotion() === true;
  const canShare = useCanShare();
  const [copied, setCopied] = useState(false);
  const open = offer !== null;
  const lines = offer === null ? [] : offerBreakdown(offer, includeExtras);
  const price = offer === null ? "" : formatOfferPrice(offer.total, offer.currency);
  const expired = offer?.gaps.includes("expired") === true;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="planner-scrim" />
        {offer ? (
          <Dialog.Content
            className="planner-detail-sheet"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <div className="planner-detail-top">
              <Dialog.Close type="button" className="planner-icon-button planner-round" aria-label="Close">
                <X />
              </Dialog.Close>
              <div className="planner-detail-tools">
                {canShare ? (
                  <button
                    type="button"
                    className="planner-icon-button planner-round"
                    aria-label="Share offer"
                    onClick={() => {
                      void shareOffer(offer, price);
                    }}
                  >
                    <Share2 />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="planner-icon-button planner-round"
                  aria-label={copied ? "Copied" : "Copy offer"}
                  onClick={() => {
                    void copyOffer(offer, price).then((ok) => setCopied(ok));
                  }}
                >
                  <Copy />
                </button>
              </div>
            </div>
            <Dialog.Description className="planner-sr">
              {offer.venueName}, {price}
            </Dialog.Description>
            <div className="planner-detail-scroll">
              <div className="planner-detail-hero">
                <span className="planner-monogram planner-monogram-lg" aria-hidden="true">
                  {offer.venueName.trim().charAt(0).toUpperCase()}
                </span>
                <div className="planner-detail-identity">
                  <div className="planner-offer-line">
                    <Dialog.Title asChild>
                      <motion.h2
                        layoutId={reduce ? undefined : `title-${offer.venueName}`}
                        transition={reduce ? { duration: 0.15 } : detailSpring}
                        className="planner-detail-title"
                      >
                        {offer.venueName}
                      </motion.h2>
                    </Dialog.Title>
                    {offer.bestMatch ? (
                      <span className="planner-chip planner-chip-best">
                        <span className="planner-best-dot" aria-hidden="true" />
                        Best match
                      </span>
                    ) : null}
                    {offer.gaps.map((gap) => (
                      <span key={gap} className="planner-chip planner-chip-status">
                        {gapLabel(gap)}
                      </span>
                    ))}
                  </div>
                  {offer.heldByCompanyName ? (
                    <p className="planner-meta">Held by {offer.heldByCompanyName}</p>
                  ) : null}
                </div>
                <div className="planner-detail-price-block">
                  <motion.p
                    layoutId={reduce ? undefined : `price-${offer.venueName}`}
                    transition={reduce ? { duration: 0.15 } : detailSpring}
                    className={expired ? "planner-detail-price planner-price-expired" : "planner-detail-price"}
                  >
                    {price}
                  </motion.p>
                  <p className="planner-meta">Total for the day, excl. VAT</p>
                </div>
              </div>
              {contextChips.length > 0 ? (
                <div className="planner-context">
                  {contextChips.map((chip) => (
                    <span key={chip} className="planner-context-chip">
                      <ContextIcon chip={chip} />
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="planner-detail-grid">
                <section>
                  <h3>Overview</h3>
                  <div className="planner-detail-copy">
                    {offer.blocks.map((block) => (
                      <p key={`${block.title}-${block.quantity}`}>
                        {block.title} × {block.quantity}
                      </p>
                    ))}
                    {offer.heldByCompanyName ? <p>Held by {offer.heldByCompanyName}</p> : null}
                    <p>
                      {price} total, excl. VAT
                    </p>
                  </div>
                </section>
                {lines.map((line) => (
                  <section key={line.key}>
                    <h3>{sectionTitle[line.key] ?? line.label}</h3>
                    <p>{line.text}</p>
                  </section>
                ))}
                <section>
                  <h3>Validity</h3>
                  <p className="planner-inline-icon">
                    <Clock aria-hidden="true" />
                    <span>{offer.expiresLabel}</span>
                  </p>
                </section>
                <section>
                  <h3>Gaps</h3>
                  <p>{offer.gaps.length === 0 ? "None" : offer.gaps.map((gap) => gapLabel(gap)).join(", ")}</p>
                </section>
              </div>
            </div>
            <div className="planner-detail-bar">
              <button type="button" className="planner-text-button" onClick={onClose}>
                Back to chat
              </button>
              <div className="planner-detail-file">
                {confirmation ? (
                  <p className="planner-meta" role="status">
                    {confirmation}
                  </p>
                ) : null}
                <button type="button" className="planner-apply" disabled={busy} onClick={onFile}>
                  File this brief
                </button>
              </div>
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ContextIcon({ chip }: { chip: string }) {
  if (chip.includes("person") || chip.includes("people")) {
    return <Users aria-hidden="true" />;
  }
  if (/\d/.test(chip)) {
    return <Calendar aria-hidden="true" />;
  }
  return <MapPin aria-hidden="true" />;
}

function useCanShare(): boolean {
  return useSyncExternalStore(emptySubscribe, shareAvailable, () => false);
}

function shareAvailable(): boolean {
  return typeof navigator.share === "function";
}

function emptySubscribe(): () => void {
  return () => undefined;
}

async function copyOffer(offer: OfferPart, price: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${offer.venueName}\n${price}`);
    return true;
  } catch {
    return false;
  }
}

async function shareOffer(offer: OfferPart, price: string): Promise<void> {
  if (typeof navigator.share !== "function") {
    return;
  }
  try {
    await navigator.share({ title: offer.venueName, text: `${offer.venueName}, ${price}` });
  } catch {
    return;
  }
}
