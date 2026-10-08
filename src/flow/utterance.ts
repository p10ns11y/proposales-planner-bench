import { extractBriefPatch, singleFieldPatch, turnIntent } from "./fixture-extractor";
import type { ViewportPhase } from "./planner-snapshot";

export const holdLine = "This bench finds a place for an event.";

export const explainLine =
  "This finds a place for an event. Say the city, when it is, and how many people.";

export type UtteranceKind = "hold" | "explain" | "plan";

export function utteranceKind(text: string, phase: ViewportPhase): UtteranceKind {
  const trimmed = text.trim();
  if (trimmed === "") {
    return "hold";
  }
  if (isServiceQuestion(trimmed)) {
    return "explain";
  }
  if (isOffTopic(trimmed)) {
    return "hold";
  }
  if (turnIntent(trimmed) === "file") {
    return "plan";
  }
  if (phase === "favorites") {
    return "plan";
  }
  if (isAffirmation(trimmed) && (phase === "confirm" || phase === "results")) {
    return "plan";
  }
  if (isPlannerText(trimmed)) {
    return "plan";
  }
  if (phase === "confirm" && isFactAnswer(trimmed)) {
    return "plan";
  }
  if (phase === "results" && answersResultField(trimmed)) {
    return "plan";
  }
  return "hold";
}

export function isAffirmation(text: string): boolean {
  return /^(yes|yeah|yep|yup|ok|okay|correct|right|confirm|that's right|thats right|looks right|looks good)$/i.test(
    text.trim(),
  );
}

function isServiceQuestion(text: string): boolean {
  return (
    /\bwhat is this for\b/i.test(text) ||
    /\bwhat is this\b/i.test(text) ||
    /\bwhat (?:do|can) you do\b/i.test(text) ||
    /\bhow does this work\b/i.test(text)
  );
}

function isOffTopic(text: string): boolean {
  return /\b(teach|teaching|lesson|homework|tutorial|python|javascript|weather|recipe|poem|essay|sort(?:ing)? algorithm)\b/i.test(
    text,
  );
}

function isPlannerText(text: string): boolean {
  if (
    /\b(place|places|venue|venues|hotel|event|offsite|retreat|conference|attendees?|people|meeting|dinner|lunch|breakfast|catering|brief|city)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return Object.keys(extractBriefPatch(text)).length > 0;
}

function answersResultField(text: string): boolean {
  if (Object.keys(extractBriefPatch(text)).length > 0) {
    return true;
  }
  return Object.keys(singleFieldPatch(text)).length > 0;
}

function isFactAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) {
    return true;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return true;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return true;
  }
  if (/^\d{1,2}\s*(?:am|pm)$/i.test(trimmed)) {
    return true;
  }
  if (/^\d+\s+hours?$/i.test(trimmed)) {
    return true;
  }
  if (/^\d+\s+minutes?$/i.test(trimmed)) {
    return true;
  }
  if (/^(yes|no)$/i.test(trimmed)) {
    return true;
  }
  return /^[A-Za-z][A-Za-z-]{1,40}$/.test(trimmed);
}
