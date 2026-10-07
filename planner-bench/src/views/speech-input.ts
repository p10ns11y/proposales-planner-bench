export const speechListeningName = "Listening";
export const speechReadyName = "Speak";
export const speechUnavailableCopy = "Speech input is unavailable in this browser.";
export const speechStartFailedCopy = "Speech input could not start in this browser.";
export const speechErrorCopy = "Speech input stopped because the browser reported an error.";

export type SpeechRecognitionLike = {
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechListener = {
  onTranscript: (transcript: string) => void;
  onListening: (listening: boolean) => void;
  onUnavailable: (reason: string) => void;
};

export type SpeechButtonState =
  | { shown: false; reason: string | null }
  | { shown: true; pressed: boolean; name: string; disabled: boolean };

export type SpeechEngine = "standard" | "prefixed";

export function speechButtonState(input: {
  supported: boolean;
  listening: boolean;
  unavailable: string | null;
  busy: boolean;
  ready: boolean;
}): SpeechButtonState {
  if (input.unavailable !== null) {
    return { shown: false, reason: input.unavailable };
  }
  if (!input.supported) {
    return { shown: false, reason: null };
  }
  if (input.listening) {
    return { shown: true, pressed: true, name: speechListeningName, disabled: false };
  }
  return {
    shown: true,
    pressed: false,
    name: speechReadyName,
    disabled: input.busy || !input.ready,
  };
}

export function speechInputAvailable(): boolean {
  return speechEngine() !== null;
}

export function speechEngine(): SpeechEngine | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (isConstructor(Reflect.get(window, "SpeechRecognition"))) {
    return "standard";
  }
  if (isConstructor(Reflect.get(window, "webkitSpeechRecognition"))) {
    return "prefixed";
  }
  return null;
}

export function isSpeechRecognitionLike(value: unknown): value is SpeechRecognitionLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const start = Reflect.get(value, "start");
  const stop = Reflect.get(value, "stop");
  return typeof start === "function" && typeof stop === "function";
}

export function openSpeechRecognition(): SpeechRecognitionLike | null {
  const engine = speechEngine();
  if (engine === null) {
    return null;
  }
  const created = instantiateSpeechEngine(engine);
  if (!isSpeechRecognitionLike(created)) {
    return null;
  }
  created.lang = "en-US";
  return created;
}

export function instantiateSpeechEngine(engine: SpeechEngine): unknown {
  const constructorValue = engineConstructor(engine);
  try {
    return Reflect.construct(constructorValue, []);
  } catch {
    return null;
  }
}

export function speechResultCount(event: unknown): number | null {
  const packed = readSpeechResults(event);
  if (packed === null) {
    return null;
  }
  return packed.count;
}

export function transcriptFromSpeechEvent(event: unknown): string {
  const packed = readSpeechResults(event);
  if (packed === null) {
    return "";
  }
  return joinedTranscripts(packed.results, packed.count);
}

export function deliverTranscript(listener: SpeechListener, transcript: string): void {
  if (transcript === "") {
    return;
  }
  listener.onTranscript(transcript);
}

export function noteSpeechEnded(listener: SpeechListener): void {
  listener.onListening(false);
}

export function noteSpeechError(listener: SpeechListener): void {
  listener.onListening(false);
  listener.onUnavailable(speechErrorCopy);
}

export function noteSpeechStarted(listener: SpeechListener): void {
  listener.onListening(true);
}

export function noteSpeechStartFailed(listener: SpeechListener): void {
  listener.onListening(false);
  listener.onUnavailable(speechStartFailedCopy);
}

export function noteSpeechMissing(listener: SpeechListener): void {
  listener.onListening(false);
  listener.onUnavailable(speechUnavailableCopy);
}

export function bindSpeechRecognition(session: SpeechRecognitionLike, listener: SpeechListener): void {
  session.onresult = (event) => {
    deliverTranscript(listener, transcriptFromSpeechEvent(event));
  };
  session.onerror = () => {
    noteSpeechError(listener);
  };
  session.onend = () => {
    noteSpeechEnded(listener);
  };
}

export function runSpeechStart(session: SpeechRecognitionLike, listener: SpeechListener): SpeechRecognitionLike | null {
  try {
    session.start();
  } catch {
    noteSpeechStartFailed(listener);
    return null;
  }
  noteSpeechStarted(listener);
  return session;
}

export function startSpeechCapture(listener: SpeechListener): SpeechRecognitionLike | null {
  const session = openSpeechRecognition();
  if (session === null) {
    noteSpeechMissing(listener);
    return null;
  }
  bindSpeechRecognition(session, listener);
  return runSpeechStart(session, listener);
}

export function stopSpeechCapture(session: SpeechRecognitionLike, listener: SpeechListener): void {
  try {
    session.stop();
  } catch {
    noteSpeechEnded(listener);
  }
}

export function toggleSpeechCapture(
  current: SpeechRecognitionLike | null,
  listening: boolean,
  listener: SpeechListener,
): SpeechRecognitionLike | null {
  if (listening) {
    if (current !== null) {
      stopSpeechCapture(current, listener);
    }
    return current;
  }
  return startSpeechCapture(listener);
}

export function readSpeechResults(event: unknown): { results: object; count: number } | null {
  const results = resultsObject(event);
  if (results === null) {
    return null;
  }
  const count = lengthOf(results);
  if (count === null) {
    return null;
  }
  return { results, count };
}

function resultsObject(event: unknown): object | null {
  if (typeof event !== "object" || event === null) {
    return null;
  }
  const results = Reflect.get(event, "results");
  if (typeof results !== "object") {
    return null;
  }
  return results;
}

function lengthOf(results: object): number | null {
  const length = Reflect.get(results, "length");
  if (!isWholeLength(length)) {
    return null;
  }
  return length;
}

function isWholeLength(length: unknown): length is number {
  if (!isIntegerNumber(length)) {
    return false;
  }
  return length >= 0;
}

function isIntegerNumber(value: unknown): value is number {
  return Number.isInteger(value);
}

function joinedTranscripts(results: object, count: number): string {
  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const line = transcriptAt(results, index);
    if (line !== "") {
      lines.push(line);
    }
  }
  return lines.join(" ");
}

function transcriptAt(results: object, index: number): string {
  const alternative = firstAlternative(Reflect.get(results, index));
  if (alternative === null) {
    return "";
  }
  return textOf(alternative);
}

function firstAlternative(result: unknown): object | null {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  const alternative = Reflect.get(result, 0);
  if (typeof alternative !== "object") {
    return null;
  }
  return alternative;
}

function textOf(alternative: object): string {
  const transcript = Reflect.get(alternative, "transcript");
  if (typeof transcript !== "string") {
    return "";
  }
  return transcript.trim();
}

function isConstructor(value: unknown): value is new () => unknown {
  return typeof value === "function";
}

function engineConstructor(engine: SpeechEngine): new () => unknown {
  const key = engine === "standard" ? "SpeechRecognition" : "webkitSpeechRecognition";
  return Reflect.get(window, key) as new () => unknown;
}
