import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindSpeechRecognition,
  deliverTranscript,
  isSpeechRecognitionLike,
  noteSpeechEnded,
  noteSpeechError,
  noteSpeechMissing,
  noteSpeechStarted,
  noteSpeechStartFailed,
  openSpeechRecognition,
  readSpeechResults,
  recognitionIdle,
  releaseSpeechRecognition,
  runSpeechStart,
  speechButtonState,
  speechEngine,
  speechErrorCode,
  speechInputAvailable,
  speechResultCount,
  copyForSpeechError,
  instantiateSpeechEngine,
  startSpeechCapture,
  stepRecognition,
  stopSpeechCapture,
  toggleSpeechCapture,
  transcriptFromSpeechEvent,
  type RecognitionSignal,
  type RecognitionState,
  type SpeechListener,
  type SpeechRecognitionLike,
} from "../src/views/speech-input";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speech button", () => {
  it("hides the control and keeps the blocked reason", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "blocked",
        busy: true,
        ready: true,
        status: "Speech input could not start in this browser.",
      }),
    ).toEqual({
      shown: false,
      reason: "Speech input could not start in this browser.",
      status: "Speech input could not start in this browser.",
    });
  });

  it("hides a blocked control even when the constructor is missing", () => {
    expect(
      speechButtonState({
        supported: false,
        phase: "blocked",
        busy: false,
        ready: false,
        status: "Speech input is unavailable in this browser.",
      }),
    ).toEqual({
      shown: false,
      reason: "Speech input is unavailable in this browser.",
      status: "Speech input is unavailable in this browser.",
    });
  });

  it("hides the control when the browser has no speech constructor", () => {
    expect(
      speechButtonState({
        supported: false,
        phase: "idle",
        busy: false,
        ready: true,
        status: "leftover",
      }),
    ).toEqual({ shown: false, reason: null, status: null });
  });

  it("shows a pressed Listening control that can stop", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "listening",
        busy: true,
        ready: false,
        status: "leftover",
      }),
    ).toEqual({ shown: true, pressed: true, name: "Listening", disabled: false, status: null });
  });

  it("shows Speak when the composer can accept text", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "idle",
        busy: false,
        ready: true,
        status: null,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: false, status: null });
  });

  it("keeps Speak usable beside a recovered status", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "idle",
        busy: false,
        ready: true,
        status: "Microphone permission was denied in this browser. Press Speak to try again.",
      }),
    ).toEqual({
      shown: true,
      pressed: false,
      name: "Speak",
      disabled: false,
      status: "Microphone permission was denied in this browser. Press Speak to try again.",
    });
  });

  it("disables Speak while a turn is in flight", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "idle",
        busy: true,
        ready: true,
        status: null,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: true, status: null });
  });

  it("disables Speak before the planner is ready", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "idle",
        busy: false,
        ready: false,
        status: null,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: true, status: null });
  });

  it("disables Speak when a turn is in flight and the planner is not ready", () => {
    expect(
      speechButtonState({
        supported: true,
        phase: "idle",
        busy: true,
        ready: false,
        status: "Speech stopped. Press Speak to try again.",
      }),
    ).toEqual({
      shown: true,
      pressed: false,
      name: "Speak",
      disabled: true,
      status: "Speech stopped. Press Speak to try again.",
    });
  });
});

describe("speech constructors", () => {
  it("is unavailable when window has no speech constructor", () => {
    expect(speechEngine()).toBeNull();
    expect(speechInputAvailable()).toBe(false);
    expect(openSpeechRecognition()).toBeNull();
  });

  it("prefers SpeechRecognition over the prefixed constructor", () => {
    const standard = markerEngine("standard");
    const prefixed = markerEngine("prefixed");
    installEngines(standard, prefixed);
    expect(speechEngine()).toBe("standard");
    expect(speechInputAvailable()).toBe(true);
    const session = openSpeechRecognition();
    expect(session).toBeInstanceOf(standard);
    expect(session).not.toBeInstanceOf(prefixed);
    expect(markedKind(session)).toBe("standard");
    expect(session?.lang).toBe("en-US");
    expect(constructedArgCount(session)).toBe(0);
  });

  it("uses webkitSpeechRecognition when the standard name is missing", () => {
    installEngines(undefined, markerEngine("prefixed"));
    expect(speechEngine()).toBe("prefixed");
    expect(speechInputAvailable()).toBe(true);
    const session = openSpeechRecognition();
    expect(markedKind(session)).toBe("prefixed");
    expect(session?.lang).toBe("en-US");
  });

  it("ignores a non-function constructor", () => {
    installEngines(1, "webkit");
    expect(speechEngine()).toBeNull();
    expect(speechInputAvailable()).toBe(false);
  });

  it("returns null when the constructor throws", () => {
    installEngines(function ThrowingEngine(this: SpeechRecognitionLike) {
      throw new Error("blocked");
    }, undefined);
    expect(instantiateSpeechEngine("standard")).toBeNull();
    expect(openSpeechRecognition()).toBeNull();
  });

  it("returns null when the instance cannot start and stop", () => {
    installEngines(function PartialEngine(this: { start: () => void }) {
      this.start = () => undefined;
    }, undefined);
    expect(openSpeechRecognition()).toBeNull();
  });
});

describe("speech session shape", () => {
  it("requires start and stop functions", () => {
    expect(isSpeechRecognitionLike(null)).toBe(false);
    expect(isSpeechRecognitionLike("speech")).toBe(false);
    expect(isSpeechRecognitionLike({})).toBe(false);
    expect(isSpeechRecognitionLike({ start() {}, stop: "no" })).toBe(false);
    expect(isSpeechRecognitionLike({ start: "no", stop() {} })).toBe(false);
    expect(isSpeechRecognitionLike({ stop() {} })).toBe(false);
    expect(isSpeechRecognitionLike({ start() {} })).toBe(false);
    expect(isSpeechRecognitionLike({ start() {}, stop() {} })).toBe(true);
  });
});

describe("transcript reader", () => {
  it("reads a list-like result that is not an array", () => {
    const results = listLike(["Stockholm", "in June"]);
    expect(Array.isArray(results)).toBe(false);
    expect(transcriptFromSpeechEvent({ results })).toBe("Stockholm in June");
    expect(speechResultCount({ results })).toBe(2);
    expect(readSpeechResults({ results })).toEqual({ results, count: 2 });
  });

  it("still reads a real array of alternatives", () => {
    expect(transcriptFromSpeechEvent({ results: [[{ transcript: "array path" }]] })).toBe("array path");
  });

  it("stops before a result past the reported length", () => {
    const results = {
      length: 1,
      0: { length: 1, 0: { transcript: "one" } },
      1: { length: 1, 0: { transcript: "trap" } },
    };
    expect(transcriptFromSpeechEvent({ results })).toBe("one");
  });

  it("uses the first alternative and trims each line", () => {
    const results = {
      length: 2,
      0: { length: 2, 0: { transcript: "  hello  " }, 1: { transcript: "ignored" } },
      1: { length: 1, 0: { transcript: " there " } },
    };
    expect(Array.isArray(results)).toBe(false);
    expect(transcriptFromSpeechEvent({ results })).toBe("hello there");
  });

  it("skips blank and non-string alternatives", () => {
    const results = {
      length: 4,
      0: { length: 1, 0: { transcript: "" } },
      1: { length: 1, 0: { transcript: 12 } },
      2: null,
      3: { length: 1, 0: { transcript: "kept" } },
    };
    expect(transcriptFromSpeechEvent({ results })).toBe("kept");
  });

  it("returns an empty string when the event has no usable results", () => {
    expect(transcriptFromSpeechEvent(null)).toBe("");
    expect(transcriptFromSpeechEvent(4)).toBe("");
    expect(transcriptFromSpeechEvent({})).toBe("");
    expect(transcriptFromSpeechEvent({ results: null })).toBe("");
    expect(transcriptFromSpeechEvent({ results: "nope" })).toBe("");
    expect(transcriptFromSpeechEvent({ results: { length: 0 } })).toBe("");
    expect(speechResultCount(null)).toBeNull();
    expect(speechResultCount({})).toBeNull();
    expect(speechResultCount({ results: null })).toBeNull();
    expect(speechResultCount({ results: { length: 0 } })).toBe(0);
    expect(readSpeechResults(null)).toBeNull();
    expect(readSpeechResults({ results: null })).toBeNull();
    expect(readSpeechResults({ results: { length: -1 } })).toBeNull();
    expect(readSpeechResults({ results: { length: "2" } })).toBeNull();
    expect(readSpeechResults({ results: { length: 0 } })).toEqual({ results: { length: 0 }, count: 0 });
  });

  it("rejects lengths that are not a non-negative integer", () => {
    expect(speechResultCount({ results: { length: -1 } })).toBeNull();
    expect(speechResultCount({ results: { length: 1.5 } })).toBeNull();
    expect(speechResultCount({ results: { length: Number.NaN } })).toBeNull();
    expect(speechResultCount({ results: { length: Number.POSITIVE_INFINITY } })).toBeNull();
    expect(speechResultCount({ results: { length: "2" } })).toBeNull();
    expect(transcriptFromSpeechEvent({ results: { length: 1.5, 0: alternative("hidden"), 1: alternative("also") } })).toBe(
      "",
    );
  });

  it("ignores a result whose alternative is missing", () => {
    expect(transcriptFromSpeechEvent({ results: { length: 1, 0: { length: 1, 0: null } } })).toBe("");
    expect(transcriptFromSpeechEvent({ results: { length: 1, 0: { length: 0 } } })).toBe("");
    expect(transcriptFromSpeechEvent({ results: { length: 1, 0: "line" } })).toBe("");
  });
});

describe("speech listeners", () => {
  it("drops an empty transcript and forwards text", () => {
    const heard = heardListener();
    deliverTranscript(heard.handlers, "");
    deliverTranscript(heard.handlers, "hello");
    expect(heard.transcripts).toEqual(["hello"]);
  });

  it("records end, error, start, start failure, and a missing engine", () => {
    const ended = heardListener();
    noteSpeechEnded(ended.handlers);
    expect(ended.signals).toEqual([{ type: "ended" }]);
    expect(fold(ended.signals)).toEqual({ phase: "idle", status: null });

    const errored = heardListener();
    noteSpeechError(errored.handlers, { error: "network" });
    expect(errored.signals).toEqual([{ type: "errored", code: "network" }]);
    expect(fold(errored.signals)).toEqual({
      phase: "idle",
      status: "Voice input paused. Tap the mic to try again.",
    });

    const started = heardListener();
    noteSpeechStarted(started.handlers);
    expect(started.signals).toEqual([{ type: "started" }]);
    expect(fold(started.signals)).toEqual({ phase: "listening", status: null });

    const failed = heardListener();
    noteSpeechStartFailed(failed.handlers);
    expect(failed.signals).toEqual([{ type: "startFailed" }]);
    expect(fold(failed.signals)).toEqual({
      phase: "blocked",
      status: "Speech input could not start in this browser.",
    });

    const missing = heardListener();
    noteSpeechMissing(missing.handlers);
    expect(missing.signals).toEqual([{ type: "missing" }]);
    expect(fold(missing.signals)).toEqual({
      phase: "blocked",
      status: "Speech input is unavailable in this browser.",
    });
  });
});

describe("recognition state", () => {
  it("returns idle with a status for every recognition error", () => {
    for (const [code, status] of speechErrorCases) {
      const listening = stepRecognition(recognitionIdle, { type: "started" });
      const errored = stepRecognition(listening, { type: "errored", code });
      const ended = stepRecognition(errored, { type: "ended" });
      expect(copyForSpeechError(code)).toBe(status);
      expect(errored).toEqual({ phase: "idle", status });
      expect(ended).toEqual({ phase: "idle", status });
      expect(
        speechButtonState({
          supported: true,
          phase: ended.phase,
          busy: false,
          ready: true,
          status: ended.status,
        }),
      ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: false, status });
    }
  });

  it("keeps the error status when end arrives before the error", () => {
    const listening = stepRecognition(recognitionIdle, { type: "started" });
    const ended = stepRecognition(listening, { type: "ended" });
    const errored = stepRecognition(ended, { type: "errored", code: "aborted" });
    expect(ended).toEqual({ phase: "idle", status: null });
    expect(errored).toEqual({ phase: "idle", status: "Speech was cancelled. Press Speak to try again." });
  });

  it("returns idle for an unknown recognition error", () => {
    const next = stepRecognition(
      { phase: "listening", status: null },
      { type: "errored", code: "service-not-allowed" },
    );
    expect(copyForSpeechError("service-not-allowed")).toBe("Speech stopped. Press Speak to try again.");
    expect(copyForSpeechError("")).toBe("Speech stopped. Press Speak to try again.");
    expect(next).toEqual({ phase: "idle", status: "Speech stopped. Press Speak to try again." });
    expect(stepRecognition(next, { type: "ended" })).toEqual(next);
  });

  it("clears the status when Speak is pressed again after permission was denied", () => {
    const denied = stepRecognition(recognitionIdle, { type: "errored", code: "not-allowed" });
    expect(denied).toEqual({
      phase: "idle",
      status: "Microphone permission was denied in this browser. Press Speak to try again.",
    });
    expect(stepRecognition(denied, { type: "started" })).toEqual({ phase: "listening", status: null });
  });

  it("stays blocked when a start failure is followed by end", () => {
    const blocked = stepRecognition(recognitionIdle, { type: "startFailed" });
    expect(blocked).toEqual({
      phase: "blocked",
      status: "Speech input could not start in this browser.",
    });
    expect(stepRecognition(blocked, { type: "ended" })).toBe(blocked);
    const missing = stepRecognition({ phase: "listening", status: "leftover" }, { type: "missing" });
    expect(missing).toEqual({
      phase: "blocked",
      status: "Speech input is unavailable in this browser.",
    });
    expect(stepRecognition(missing, { type: "ended" })).toEqual(missing);
  });

  it("reads an error code only from a string field", () => {
    expect(speechErrorCode(null)).toBe("");
    expect(speechErrorCode(4)).toBe("");
    expect(speechErrorCode("not-allowed")).toBe("");
    expect(speechErrorCode({})).toBe("");
    expect(speechErrorCode({ error: 1 })).toBe("");
    expect(speechErrorCode({ error: null })).toBe("");
    expect(speechErrorCode({ error: "" })).toBe("");
    expect(speechErrorCode({ error: "audio-capture" })).toBe("audio-capture");
    const heard = heardListener();
    noteSpeechError(heard.handlers, null);
    noteSpeechError(heard.handlers, { error: "" });
    noteSpeechError(heard.handlers, { error: "no-speech" });
    expect(heard.signals).toEqual([
      { type: "errored", code: "" },
      { type: "errored", code: "" },
      { type: "errored", code: "no-speech" },
    ]);
    expect(fold([{ type: "errored", code: "" }])).toEqual({
      phase: "idle",
      status: "Speech stopped. Press Speak to try again.",
    });
  });
});

describe("speech capture", () => {
  it("delivers a list-like transcript and then ends", () => {
    const engine = markerEngine("standard");
    installEngines(engine, undefined);
    const heard = heardListener();
    const session = startSpeechCapture(heard.handlers);
    expect(session).not.toBeNull();
    expect(session?.lang).toBe("en-US");
    expect(fold(heard.signals)).toEqual({ phase: "listening", status: null });
    const results = listLike(["North wind"]);
    expect(Array.isArray(results)).toBe(false);
    session?.onresult?.({ results });
    session?.onresult?.({ results: { length: 1, 0: { length: 1, 0: { transcript: "" } } } });
    session?.onend?.();
    expect(heard.transcripts).toEqual(["North wind"]);
    expect(fold(heard.signals)).toEqual({ phase: "idle", status: null });
  });

  it("reports a start failure and does not leave the session listening", () => {
    installEngines(failingStartEngine(), undefined);
    const heard = heardListener();
    expect(startSpeechCapture(heard.handlers)).toBeNull();
    expect(heard.signals).toEqual([{ type: "started" }, { type: "startFailed" }]);
    expect(fold(heard.signals)).toEqual({
      phase: "blocked",
      status: "Speech input could not start in this browser.",
    });
    expect(heard.transcripts).toEqual([]);
  });

  it("returns to idle after a recognition error and a following end", () => {
    installEngines(markerEngine("standard"), undefined);
    const heard = heardListener();
    const session = startSpeechCapture(heard.handlers);
    session?.onerror?.({ error: "audio-capture" });
    session?.onend?.();
    expect(fold(heard.signals)).toEqual({
      phase: "idle",
      status: "The microphone could not be opened. Press Speak to try again.",
    });
    session?.onerror?.({});
    expect(fold(heard.signals)).toEqual({
      phase: "idle",
      status: "Speech stopped. Press Speak to try again.",
    });
  });

  it("returns to idle when the error is reported inside start", () => {
    installEngines(syncErrorEngine(), undefined);
    const heard = heardListener();
    const session = startSpeechCapture(heard.handlers);
    expect(session).not.toBeNull();
    expect(fold(heard.signals)).toEqual({
      phase: "idle",
      status: "No speech was heard. Press Speak to try again.",
    });
  });

  it("explains a missing engine", () => {
    const heard = heardListener();
    expect(startSpeechCapture(heard.handlers)).toBeNull();
    expect(heard.signals).toEqual([{ type: "missing" }]);
    expect(fold(heard.signals)).toEqual({
      phase: "blocked",
      status: "Speech input is unavailable in this browser.",
    });
  });

  it("stops a listening session and recovers when stop throws", () => {
    const session = fakeSession();
    const heard = heardListener();
    bindSpeechRecognition(session, heard.handlers);
    stopSpeechCapture(session, heard.handlers);
    expect(session.stopped).toBe(1);
    expect(heard.signals).toEqual([]);

    session.failStop = true;
    stopSpeechCapture(session, heard.handlers);
    expect(heard.signals).toEqual([{ type: "ended" }]);
    expect(fold(heard.signals)).toEqual({ phase: "idle", status: null });
  });

  it("toggles between start and stop", () => {
    installEngines(markerEngine("standard"), undefined);
    const heard = heardListener();
    const started = toggleSpeechCapture(null, false, heard.handlers);
    expect(started).not.toBeNull();
    expect(fold(heard.signals)).toEqual({ phase: "listening", status: null });
    const stopped = toggleSpeechCapture(started, true, heard.handlers);
    expect(stopped).toBe(started);
    expect((started as FakeSession).stopped).toBe(1);
    expect(toggleSpeechCapture(null, true, heard.handlers)).toBeNull();
    expect(fold(heard.signals)).toEqual({ phase: "listening", status: null });
  });

  it("drops events from the previous session when Speak is pressed again", () => {
    installEngines(markerEngine("standard"), undefined);
    const heard = heardListener();
    const first = toggleSpeechCapture(null, false, heard.handlers);
    expect(first).not.toBeNull();
    first?.onerror?.({ error: "not-allowed" });
    first?.onend?.();
    expect(fold(heard.signals)).toEqual({
      phase: "idle",
      status: "Microphone permission was denied in this browser. Press Speak to try again.",
    });
    const second = toggleSpeechCapture(first, false, heard.handlers);
    expect(second).not.toBe(first);
    expect(first?.onresult).toBeNull();
    expect(first?.onerror).toBeNull();
    expect(first?.onend).toBeNull();
    const beforeLate = heard.signals.length;
    first?.onresult?.({ results: listLike(["late"]) });
    first?.onerror?.({ error: "network" });
    first?.onend?.();
    expect(heard.signals).toHaveLength(beforeLate);
    expect(heard.transcripts).toEqual([]);
    expect(fold(heard.signals)).toEqual({ phase: "listening", status: null });
    const loose = fakeSession();
    bindSpeechRecognition(loose, heard.handlers);
    releaseSpeechRecognition(loose);
    expect(loose.onresult).toBeNull();
    expect(loose.onerror).toBeNull();
    expect(loose.onend).toBeNull();
  });

  it("runs start on an armed session", () => {
    const session = fakeSession();
    const heard = heardListener();
    expect(runSpeechStart(session, heard.handlers)).toBe(session);
    expect(session.started).toBe(1);
    expect(heard.signals).toEqual([{ type: "started" }]);
    session.failStart = true;
    expect(runSpeechStart(session, heard.handlers)).toBeNull();
    expect(fold(heard.signals)).toEqual({
      phase: "blocked",
      status: "Speech input could not start in this browser.",
    });
  });

  it("binds result, error, and end handlers", () => {
    const session = fakeSession();
    const heard = heardListener();
    bindSpeechRecognition(session, heard.handlers);
    session.onresult?.({ results: listLike(["bound"]) });
    session.onerror?.({ error: "no-speech" });
    session.onend?.();
    expect(heard.transcripts).toEqual(["bound"]);
    expect(fold(heard.signals)).toEqual({
      phase: "idle",
      status: "No speech was heard. Press Speak to try again.",
    });
  });
});

type MarkerEngine = new () => SpeechRecognitionLike & { kind: string };

class FakeSession implements SpeechRecognitionLike {
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  started = 0;
  stopped = 0;
  failStart = false;
  failStop = false;
  kind = "fake";

  start(): void {
    this.started += 1;
    if (this.failStart) {
      throw new Error("blocked");
    }
  }

  stop(): void {
    this.stopped += 1;
    if (this.failStop) {
      throw new Error("blocked");
    }
  }
}

function markerEngine(kind: string): MarkerEngine {
  return class extends FakeSession {
    argc = 0;

    constructor(...args: unknown[]) {
      super();
      this.kind = kind;
      this.argc = args.length;
    }
  };
}

function constructedArgCount(session: SpeechRecognitionLike | null): number {
  if (session !== null && "argc" in session && typeof session.argc === "number") {
    return session.argc;
  }
  return -1;
}

function failingStartEngine(): MarkerEngine {
  return class extends FakeSession {
    override start(): void {
      throw new Error("blocked");
    }
  };
}

function syncErrorEngine(): MarkerEngine {
  return class extends FakeSession {
    override start(): void {
      this.started += 1;
      this.onerror?.({ error: "no-speech" });
      this.onend?.();
    }
  };
}

function fakeSession(): FakeSession {
  return new FakeSession();
}

function markedKind(session: SpeechRecognitionLike | null): string {
  if (session instanceof FakeSession) {
    return session.kind;
  }
  return "";
}

function installEngines(standard: unknown, prefixed: unknown) {
  vi.stubGlobal("window", {
    SpeechRecognition: standard,
    webkitSpeechRecognition: prefixed,
  });
}

function listLike(lines: string[]): object {
  const results: Record<number, unknown> & { length: number } = { length: lines.length };
  for (let index = 0; index < lines.length; index += 1) {
    results[index] = alternative(lines[index] ?? "");
  }
  return results;
}

function alternative(transcript: string): object {
  return { length: 1, 0: { transcript } };
}

const speechErrorCases = [
  ["no-speech", "No speech was heard. Press Speak to try again."],
  ["network", "Voice input paused. Tap the mic to try again."],
  ["aborted", "Speech was cancelled. Press Speak to try again."],
  ["not-allowed", "Microphone permission was denied in this browser. Press Speak to try again."],
  ["audio-capture", "The microphone could not be opened. Press Speak to try again."],
] as const;

function fold(signals: RecognitionSignal[], state: RecognitionState = recognitionIdle): RecognitionState {
  return signals.reduce(stepRecognition, state);
}

function heardListener(): { handlers: SpeechListener; transcripts: string[]; signals: RecognitionSignal[] } {
  const transcripts: string[] = [];
  const signals: RecognitionSignal[] = [];
  return {
    transcripts,
    signals,
    handlers: {
      onTranscript: (transcript) => {
        transcripts.push(transcript);
      },
      onSignal: (signal) => {
        signals.push(signal);
      },
    },
  };
}
