import type { BriefDraft, ProposalesClient } from "./types";

export type FileIntent = {
  explicit: true;
};

type FileRouteRequest = (path: string, init: RequestInit, authorize: boolean) => Promise<unknown>;

export function askedToFile(): FileIntent {
  return { explicit: true };
}

export function inboxFileRoute(token: string): string {
  return `/v1/inbox/${encodeURIComponent(token)}`;
}

export function draftFileRoute(): string {
  return "/v3/proposals";
}

export async function postInboxFile(input: {
  request: FileRouteRequest;
  token: string;
  body: unknown;
}): Promise<unknown> {
  return input.request(inboxFileRoute(input.token), { method: "POST", body: JSON.stringify(input.body) }, false);
}

export async function postDraftFile(input: { request: FileRouteRequest; body: unknown }): Promise<unknown> {
  return input.request(draftFileRoute(), { method: "POST", body: JSON.stringify(input.body) }, true);
}

export async function sendFileBrief(
  client: Pick<ProposalesClient, "fileBrief">,
  brief: BriefDraft,
): Promise<Awaited<ReturnType<ProposalesClient["fileBrief"]>>> {
  return client.fileBrief(brief);
}

export async function fileWithIntent<T>(input: {
  intent: FileIntent | null;
  refused: T;
  send: () => Promise<T>;
}): Promise<T> {
  if (input.intent?.explicit !== true) {
    return input.refused;
  }
  return tryFile(input.send);
}

async function tryFile<T>(send: () => Promise<T>): Promise<T> {
  return send();
}
