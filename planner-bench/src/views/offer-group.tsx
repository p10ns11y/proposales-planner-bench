"use client";

import {
  BedDouble,
  ChevronRight,
  ClockAlert,
  Columns2,
  ExternalLink,
  LayoutTemplate,
  MapPin,
  Package,
  Presentation,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  dayPriceNote,
  formatOfferPrice,
  offerBreakdown,
  showCompareToggle,
  type BreakdownLine,
  type OfferGroupPart,
  type OfferPart,
} from "../contract/offer-group";
import { gapLabel } from "./offer-copy";

const detailSpring = { type: "spring" as const, stiffness: 380, damping: 34 };

type OfferGroupCardProps = {
  group: OfferGroupPart;
  hiddenCount: number;
  openName: string | null;
  onOpen: (venueName: string) => void;
  onShowMore: () => void;
};

export function OfferGroupCard({ group, hiddenCount, openName, onOpen, onShowMore }: OfferGroupCardProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [compareOn, setCompareOn] = useState(false);
  const reduce = useReducedMotion() === true;
  const includeExtras = group.offers.some((offer) => offer.extras !== 0);
  const canCompare = showCompareToggle(group.offers.length, width);
  const comparing = compareOn && canCompare;

  useEffect(() => {
    const element = frameRef.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function openAll() {
    if (comparing) {
      setCompareOn(false);
      return;
    }
    if (hiddenCount > 0) {
      onShowMore();
    }
  }

  return (
    <motion.div layout={reduce ? false : "size"} className="planner-offer-group" ref={frameRef}>
      <div className="planner-group-head">
        <p className="planner-group-summary" data-must-show="facts">
          <MapPin aria-hidden="true" />
          <span>{group.summary.line}</span>
        </p>
        <div className="planner-group-tools">
          {group.sourceLabel ? (
            <span
              className="planner-chip planner-chip-status"
              title={
                group.sampleData ? "Your Proposales account has no matching proposals yet." : undefined
              }
            >
              {group.sourceLabel}
            </span>
          ) : null}
          {canCompare ? (
            <button
              type="button"
              className={comparing ? "planner-compare-toggle planner-compare-on" : "planner-compare-toggle"}
              aria-pressed={comparing}
              onClick={() => setCompareOn((current) => !current)}
            >
              <Columns2 aria-hidden="true" />
              Compare
            </button>
          ) : null}
          <button
            type="button"
            className="planner-open-all"
            disabled={!comparing && hiddenCount === 0}
            onClick={openAll}
          >
            <ExternalLink aria-hidden="true" />
            Open all
          </button>
        </div>
      </div>
      {comparing ? (
        <div
          className="planner-compare-grid"
          data-columns={group.offers.length === 2 ? "2" : "3"}
        >
          {group.offers.map((offer) => (
            <CompareCard
              key={offer.proposalUuid}
              offer={offer}
              includeExtras={includeExtras}
              reduce={reduce}
              open={openName === offer.venueName}
              onOpen={onOpen}
            />
          ))}
        </div>
      ) : (
        <div className="planner-offer-list">
          {group.offers.map((offer, index) => (
            <OfferRow
              key={offer.proposalUuid}
              offer={offer}
              index={index}
              reduce={reduce}
              open={openName === offer.venueName}
              onOpen={onOpen}
            />
          ))}
          {hiddenCount > 0 ? (
            <button type="button" className="planner-further" onClick={onShowMore}>
              Further matches
            </button>
          ) : null}
        </div>
      )}
      <p className="planner-price-note">{group.footer || dayPriceNote}</p>
    </motion.div>
  );
}

function OfferRow({
  offer,
  index,
  reduce,
  open,
  onOpen,
}: {
  offer: OfferPart;
  index: number;
  reduce: boolean;
  open: boolean;
  onOpen: (venueName: string) => void;
}) {
  const expired = offer.gaps.includes("expired");
  const price = formatOfferPrice(offer.total, offer.currency);
  if (open) {
    return <div className="planner-offer planner-offer-ghost" aria-hidden="true" />;
  }
  return (
    <motion.button
      type="button"
      layoutId={reduce ? undefined : `offer-${offer.venueName}`}
      transition={reduce ? { duration: 0.15 } : detailSpring}
      className="planner-offer"
      data-offer-card="true"
      data-venue={offer.venueName}
      data-gap={offer.gaps.length > 0 ? "missing" : "clear"}
      data-best={offer.bestMatch ? "yes" : "no"}
      aria-label={accessibleOffer(offer, price)}
      onClick={() => onOpen(offer.venueName)}
      onKeyDown={(event) => moveCardFocus(event, index)}
    >
      <span className="planner-monogram" aria-hidden="true">
        {monogram(offer.venueName)}
      </span>
      <span className="planner-offer-copy">
        <span className="planner-offer-line">
          <motion.span layoutId={reduce ? undefined : `title-${offer.venueName}`} className="planner-offer-name">
            {offer.venueName}
          </motion.span>
          <OfferChips offer={offer} />
        </span>
        {offer.heldByCompanyName ? <span className="planner-meta">Held by {offer.heldByCompanyName}</span> : null}
      </span>
      <motion.span
        layoutId={reduce ? undefined : `price-${offer.venueName}`}
        className={expired ? "planner-price planner-price-expired" : "planner-price"}
      >
        {price}
      </motion.span>
      <ChevronRight className="planner-offer-chevron" aria-hidden="true" />
    </motion.button>
  );
}

function CompareCard({
  offer,
  includeExtras,
  reduce,
  open,
  onOpen,
}: {
  offer: OfferPart;
  includeExtras: boolean;
  reduce: boolean;
  open: boolean;
  onOpen: (venueName: string) => void;
}) {
  const expired = offer.gaps.includes("expired");
  const price = formatOfferPrice(offer.total, offer.currency);
  const lines = offerBreakdown(offer, includeExtras);
  return (
    <article className={offer.bestMatch ? "planner-compare-card planner-compare-best" : "planner-compare-card"}>
      <motion.p
        layoutId={reduce ? undefined : `price-${offer.venueName}`}
        className={expired ? "planner-compare-price planner-price-expired" : "planner-compare-price"}
      >
        {price}
      </motion.p>
      <div className="planner-compare-name">
        <motion.h3 layoutId={reduce ? undefined : `title-${offer.venueName}`} className="planner-offer-name">
          {offer.venueName}
        </motion.h3>
        <OfferChips offer={offer} />
      </div>
      {offer.heldByCompanyName ? <p className="planner-meta">Held by {offer.heldByCompanyName}</p> : null}
      <ul className="planner-breakdown">
        {lines.map((line) => (
          <li key={line.key}>
            <BreakdownIcon line={line.key} />
            <span>
              {line.label}: {line.text}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="planner-open-pill"
        data-offer-card="true"
        data-venue={offer.venueName}
        disabled={open}
        onClick={() => onOpen(offer.venueName)}
      >
        Open
      </button>
    </article>
  );
}

function OfferChips({ offer }: { offer: OfferPart }) {
  return (
    <span className="planner-chips">
      {offer.bestMatch ? (
        <span className="planner-chip planner-chip-best">
          <span className="planner-best-dot" aria-hidden="true" />
          Best match
        </span>
      ) : null}
      {offer.favorite ? <span className="planner-chip planner-chip-status">Favorite</span> : null}
      {offer.gaps.map((gap) => (
        <span key={gap} className="planner-chip planner-chip-status">
          <GapIcon gap={gap} />
          {gapLabel(gap)}
        </span>
      ))}
    </span>
  );
}

export function GapIcon({ gap }: { gap: string }) {
  if (gap === "expired") {
    return <ClockAlert aria-hidden="true" />;
  }
  if (gap === "foodAndBeverage") {
    return <UtensilsCrossed aria-hidden="true" />;
  }
  if (gap === "space") {
    return <Presentation aria-hidden="true" />;
  }
  if (gap === "rooms") {
    return <BedDouble aria-hidden="true" />;
  }
  return null;
}

function BreakdownIcon({ line }: { line: BreakdownLine["key"] }) {
  const icon =
    line === "rooms" ? (
      <BedDouble aria-hidden="true" />
    ) : line === "foodAndBeverage" ? (
      <Utensils aria-hidden="true" />
    ) : line === "space" ? (
      <LayoutTemplate aria-hidden="true" />
    ) : line === "extras" ? (
      <Package aria-hidden="true" />
    ) : (
      <Package aria-hidden="true" />
    );
  return icon;
}

function moveCardFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }
  const cards = event.currentTarget.closest(".planner-offer-group")?.querySelectorAll<HTMLButtonElement>("[data-offer-card]");
  if (!cards || cards.length === 0) {
    return;
  }
  event.preventDefault();
  const nextIndex = event.key === "ArrowDown" ? Math.min(index + 1, cards.length - 1) : Math.max(index - 1, 0);
  cards[nextIndex]?.focus();
}

function accessibleOffer(offer: OfferPart, price: string): string {
  const parts = [offer.venueName, price];
  if (offer.bestMatch) {
    parts.push("Best match");
  }
  if (offer.heldByCompanyName) {
    parts.push(`Held by ${offer.heldByCompanyName}`);
  }
  if (offer.favorite) {
    parts.push("Favorite");
  }
  for (const gap of offer.gaps) {
    parts.push(gapLabel(gap));
  }
  return parts.join(", ");
}

function monogram(name: string): string {
  const letter = name.trim().charAt(0);
  return letter === "" ? "?" : letter.toUpperCase();
}
