export type FileBriefChoice = "ignore" | "ask-email" | "send";

export function fileBriefChoice(input: {
  filed: boolean;
  busy: boolean;
  ready: boolean;
  email: string;
}): FileBriefChoice {
  if (!input.ready || input.busy || input.filed) {
    return "ignore";
  }
  if (input.email.trim() === "") {
    return "ask-email";
  }
  return "send";
}

export function fileBriefLabel(filed: boolean): string {
  return filed ? "Filed" : "File this brief";
}

export function fileBriefDisabled(busy: boolean, filed: boolean): boolean {
  return busy || filed;
}

export const emailReplyHint = "Venues reply to this address";

export const moreOpenedForEmail = "More opened so venues reply to this address.";

export function emailApplyDecision(input: { required: boolean; email: string }): "apply" | "need-email" {
  if (!input.required) {
    return "apply";
  }
  if (input.email.trim() === "") {
    return "need-email";
  }
  return "apply";
}

export function fileBriefPressable(input: { busy: boolean; filed: boolean; ready: boolean }): boolean {
  if (!input.ready) {
    return false;
  }
  if (input.busy) {
    return false;
  }
  if (input.filed) {
    return false;
  }
  return true;
}

function readable(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return trimmed;
}

export function detailStatusLine(input: {
  errorText: string | null;
  filingMessage: string | null;
  whyMore: string | null;
}): string | null {
  const errorText = readable(input.errorText);
  if (errorText !== null) {
    return errorText;
  }
  const whyMore = readable(input.whyMore);
  if (whyMore !== null) {
    return whyMore;
  }
  return readable(input.filingMessage);
}
