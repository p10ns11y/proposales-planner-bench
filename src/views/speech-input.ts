export const speechListeningName = "Listening";
export const speechReadyName = "Speak";
export const speechUnavailableCopy = "Speech input is unavailable in this browser.";
export const speechStartFailedCopy = "Speech input could not start in this browser.";
export const speechRecoveredCopy = "Speech stopped. Press Speak to try again.";
export const speechNoSpeechCopy = "No speech was heard. Press Speak to try again.";
export const speechNetworkCopy = "Voice input paused. Tap the mic to try again.";
export const speechAbortedCopy = "Speech was cancelled. Press Speak to try again.";
export const speechDeniedCopy = "Microphone permission was denied in this browser. Press Speak to try again.";
export const speechAudioCopy = "The microphone could not be opened. Press Speak to try again.";

const speechCopyByError: Record<string, string> = {
  "no-speech": speechNoSpeechCopy,
  network: speechNetworkCopy,
  aborted: speechAbortedCopy,
  "not-allowed": speechDeniedCopy,
  "audio-capture": speechAudioCopy,
};

export type SpeechRecognitionLike = {
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type RecognitionPhase = "idle" | "listening" | "blocked";

export type RecognitionState = {
  phase: RecognitionPhase;
  status: string | null;
};

export const recognitionIdle: RecognitionState = { phase: "idle", status: null };

export type RecognitionSignal =
  | { type: "started" }
  | { type: "ended" }
  | { type: "errored"; code: string }
  | { type: "startFailed" }
  | { type: "missing" };

export type SpeechListener = {
  onTranscript: (transcript: string) => void;
  onSignal: (signal: RecognitionSignal) => void;
};

export type SpeechButtonState =
  | { shown: false; reason: string | null; status: string | null }
  | { shown: true; pressed: boolean; name: string; disabled: boolean; status: string | null };

export type SpeechEngine = "standard" | "prefixed";

export function copyForSpeechError(code: string): string {
  const copy = speechCopyByError[code];
  if (typeof copy !== "string") {
    return speechRecoveredCopy;
  }
  return copy;
}

export function speechErrorCode(event: unknown): string {
  if (typeof event !== "object" || event === null) {
    return "";
  }
  const error = Reflect.get(event, "error");
  if (typeof error !== "string") {
    return "";
  }
  return error;
}

export function stepRecognition(state: RecognitionState, signal: RecognitionSignal): RecognitionState {
  if (signal.type === "started") {
    return { phase: "listening", status: null };
  }
  if (signal.type === "ended") {
    return endedRecognition(state);
  }
  if (signal.type === "errored") {
    return { phase: "idle", status: copyForSpeechError(signal.code) };
  }
  if (signal.type === "startFailed") {
    return { phase: "blocked", status: speechStartFailedCopy };
  }
  return { phase: "blocked", status: speechUnavailableCopy };
}

export function speechButtonState(input: {
  supported: boolean;
  phase: RecognitionPhase;
  busy: boolean;
  ready: boolean;
  status: string | null;
}): SpeechButtonState {
  if (input.phase === "blocked") {
    return { shown: false, reason: input.status, status: input.status };
  }
  if (!input.supported) {
    return { shown: false, reason: null, status: null };
  }
  if (input.phase === "listening") {
    return { shown: true, pressed: true, name: speechListeningName, disabled: false, status: null };
  }
  return {
    shown: true,
    pressed: false,
    name: speechReadyName,
    disabled: input.busy || !input.ready,
    status: input.status,
  };
}

function endedRecognition(state: RecognitionState): RecognitionState {
  if (state.phase === "blocked") {
    return state;
  }
  return { phase: "idle", status: state.status };
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
  listener.onSignal({ type: "ended" });
}

export function noteSpeechError(listener: SpeechListener, event: unknown): void {
  listener.onSignal({ type: "errored", code: speechErrorCode(event) });
}

export function noteSpeechStarted(listener: SpeechListener): void {
  listener.onSignal({ type: "started" });
}

export function noteSpeechStartFailed(listener: SpeechListener): void {
  listener.onSignal({ type: "startFailed" });
}

export function noteSpeechMissing(listener: SpeechListener): void {
  listener.onSignal({ type: "missing" });
}

export function bindSpeechRecognition(session: SpeechRecognitionLike, listener: SpeechListener): void {
  session.onresult = (event) => {
    deliverTranscript(listener, transcriptFromSpeechEvent(event));
  };
  session.onerror = (event) => {
    noteSpeechError(listener, event);
  };
  session.onend = () => {
    noteSpeechEnded(listener);
  };
}

export function releaseSpeechRecognition(session: SpeechRecognitionLike): void {
  session.onresult = null;
  session.onerror = null;
  session.onend = null;
}

export function runSpeechStart(session: SpeechRecognitionLike, listener: SpeechListener): SpeechRecognitionLike | null {
  noteSpeechStarted(listener);
  try {
    session.start();
  } catch {
    noteSpeechStartFailed(listener);
    return null;
  }
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
  if (current !== null) {
    releaseSpeechRecognition(current);
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
