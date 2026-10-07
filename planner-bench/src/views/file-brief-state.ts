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
