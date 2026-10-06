import { findBriefGaps, questionForGap } from "../domain/fitness";
import { emptySnapshot, plannerSnapshotSchema, type PlannerSnapshot } from "./planner-snapshot";

export type ChatTurnMessage = {
  role: string;
  text: string;
};

export function readChatRequest(value: unknown): {
  messages: ChatTurnMessage[];
  snapshot: PlannerSnapshot | null;
} {
  if (!isRecord(value)) {
    throw new Error("Chat request must be an object.");
  }
  const messages = value.messages;
  if (!Array.isArray(messages)) {
    throw new Error("Chat request needs messages.");
  }
  const snapshotValue = value.snapshot;
  return {
    messages: messages.map(readChatMessage),
    snapshot: snapshotValue === undefined ? null : plannerSnapshotSchema.parse(snapshotValue),
  };
}

export function latestUserText(messages: ChatTurnMessage[]): string {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    if (message !== undefined && message.role === "user") {
      return message.text;
    }
  }
  return "";
}

export function openingSnapshot(companies: PlannerSnapshot["companies"]): PlannerSnapshot {
  const gaps = findBriefGaps({}, "brief:fileable");
  const firstGap = gaps[0];
  return emptySnapshot(
    companies,
    firstGap === undefined ? "" : questionForGap(firstGap),
    gaps,
  );
}

function readChatMessage(value: unknown): ChatTurnMessage {
  if (!isRecord(value) || typeof value.role !== "string") {
    throw new Error("Chat message needs a role.");
  }
  return {
    role: value.role,
    text: textFromMessage(value),
  };
}

function textFromMessage(value: Record<string, unknown>): string {
  if (typeof value.text === "string") {
    return value.text;
  }
  if (!Array.isArray(value.parts)) {
    return "";
  }
  const chunks: string[] = [];
  for (const part of value.parts) {
    if (!isRecord(part) || part.type !== "text" || typeof part.text !== "string") {
      continue;
    }
    chunks.push(part.text);
  }
  return chunks.join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
