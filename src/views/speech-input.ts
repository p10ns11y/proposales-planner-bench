type SpeechSession = {
  lang: string;
  onresult: ((event: unknown) => void) | null;
  start: () => void;
};

export function speechInputAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const standard = Reflect.get(window, "SpeechRecognition");
  const prefixed = Reflect.get(window, "webkitSpeechRecognition");
  return typeof standard === "function" || typeof prefixed === "function";
}

export function startSpeechCapture(onTranscript: (transcript: string) => void): void {
  const recognition = openSpeechInput();
  if (!recognition) {
    return;
  }
  recognition.onresult = (speechEvent) => {
    const transcript = transcriptFromSpeechEvent(speechEvent);
    if (transcript !== "") {
      onTranscript(transcript);
    }
  };
  recognition.start();
}

function openSpeechInput(): SpeechSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const constructorValue =
    Reflect.get(window, "SpeechRecognition") ?? Reflect.get(window, "webkitSpeechRecognition");
  if (typeof constructorValue !== "function") {
    return null;
  }
  const session: unknown = Reflect.construct(constructorValue, []);
  if (!isSpeechSession(session)) {
    return null;
  }
  session.lang = "en-US";
  return session;
}

function isSpeechSession(value: unknown): value is SpeechSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const start = Reflect.get(value, "start");
  return typeof start === "function";
}

function transcriptFromSpeechEvent(event: unknown): string {
  if (typeof event !== "object" || event === null) {
    return "";
  }
  const results = Reflect.get(event, "results");
  if (!Array.isArray(results) || results.length === 0) {
    return "";
  }
  const firstResult = results[0];
  if (!Array.isArray(firstResult) || firstResult.length === 0) {
    return "";
  }
  const alternative = firstResult[0];
  if (typeof alternative !== "object" || alternative === null) {
    return "";
  }
  const transcript = Reflect.get(alternative, "transcript");
  return typeof transcript === "string" ? transcript : "";
}
