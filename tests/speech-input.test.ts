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
  runSpeechStart,
  speechButtonState,
  speechEngine,
  speechInputAvailable,
  speechResultCount,
  instantiateSpeechEngine,
  startSpeechCapture,
  stopSpeechCapture,
  toggleSpeechCapture,
  transcriptFromSpeechEvent,
  type SpeechListener,
  type SpeechRecognitionLike,
} from "../src/views/speech-input";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("speech button", () => {
  it("hides the control and keeps the browser reason", () => {
    expect(
      speechButtonState({
        supported: true,
        listening: true,
        unavailable: "Speech input could not start in this browser.",
        busy: true,
        ready: true,
      }),
    ).toEqual({ shown: false, reason: "Speech input could not start in this browser." });
  });

  it("hides the control when the browser has no speech constructor", () => {
    expect(
      speechButtonState({
        supported: false,
        listening: false,
        unavailable: null,
        busy: false,
        ready: true,
      }),
    ).toEqual({ shown: false, reason: null });
  });

  it("shows a pressed Listening control that can stop", () => {
    expect(
      speechButtonState({
        supported: true,
        listening: true,
        unavailable: null,
        busy: true,
        ready: false,
      }),
    ).toEqual({ shown: true, pressed: true, name: "Listening", disabled: false });
  });

  it("shows Speak when the composer can accept text", () => {
    expect(
      speechButtonState({
        supported: true,
        listening: false,
        unavailable: null,
        busy: false,
        ready: true,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: false });
  });

  it("disables Speak while a turn is in flight", () => {
    expect(
      speechButtonState({
        supported: true,
        listening: false,
        unavailable: null,
        busy: true,
        ready: true,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: true });
  });

  it("disables Speak before the planner is ready", () => {
    expect(
      speechButtonState({
        supported: true,
        listening: false,
        unavailable: null,
        busy: false,
        ready: false,
      }),
    ).toEqual({ shown: true, pressed: false, name: "Speak", disabled: true });
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
    expect(ended.listening).toEqual([false]);
    expect(ended.reasons).toEqual([]);

    const errored = heardListener();
    noteSpeechError(errored.handlers);
    expect(errored.listening).toEqual([false]);
    expect(errored.reasons).toEqual(["Speech input stopped because the browser reported an error."]);

    const started = heardListener();
    noteSpeechStarted(started.handlers);
    expect(started.listening).toEqual([true]);
    expect(started.reasons).toEqual([]);

    const failed = heardListener();
    noteSpeechStartFailed(failed.handlers);
    expect(failed.listening).toEqual([false]);
    expect(failed.reasons).toEqual(["Speech input could not start in this browser."]);

    const missing = heardListener();
    noteSpeechMissing(missing.handlers);
    expect(missing.listening).toEqual([false]);
    expect(missing.reasons).toEqual(["Speech input is unavailable in this browser."]);
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
    expect(heard.listening).toEqual([true]);
    expect(heard.reasons).toEqual([]);
    const results = listLike(["North wind"]);
    expect(Array.isArray(results)).toBe(false);
    session?.onresult?.({ results });
    session?.onresult?.({ results: { length: 1, 0: { length: 1, 0: { transcript: "" } } } });
    session?.onend?.();
    expect(heard.transcripts).toEqual(["North wind"]);
    expect(heard.listening).toEqual([true, false]);
    expect(heard.reasons).toEqual([]);
  });

  it("reports a start failure and does not leave the session listening", () => {
    installEngines(failingStartEngine(), undefined);
    const heard = heardListener();
    expect(startSpeechCapture(heard.handlers)).toBeNull();
    expect(heard.listening).toEqual([false]);
    expect(heard.reasons).toEqual(["Speech input could not start in this browser."]);
    expect(heard.transcripts).toEqual([]);
  });

  it("reports an error from the session", () => {
    installEngines(markerEngine("standard"), undefined);
    const heard = heardListener();
    const session = startSpeechCapture(heard.handlers);
    session?.onerror?.({});
    expect(heard.listening).toEqual([true, false]);
    expect(heard.reasons).toEqual(["Speech input stopped because the browser reported an error."]);
  });

  it("explains a missing engine", () => {
    const heard = heardListener();
    expect(startSpeechCapture(heard.handlers)).toBeNull();
    expect(heard.reasons).toEqual(["Speech input is unavailable in this browser."]);
    expect(heard.listening).toEqual([false]);
  });

  it("stops a listening session and recovers when stop throws", () => {
    const session = fakeSession();
    const heard = heardListener();
    bindSpeechRecognition(session, heard.handlers);
    stopSpeechCapture(session, heard.handlers);
    expect(session.stopped).toBe(1);
    expect(heard.listening).toEqual([]);

    session.failStop = true;
    stopSpeechCapture(session, heard.handlers);
    expect(heard.listening).toEqual([false]);
    expect(heard.reasons).toEqual([]);
  });

  it("toggles between start and stop", () => {
    installEngines(markerEngine("standard"), undefined);
    const heard = heardListener();
    const started = toggleSpeechCapture(null, false, heard.handlers);
    expect(started).not.toBeNull();
    expect(heard.listening).toEqual([true]);
    const stopped = toggleSpeechCapture(started, true, heard.handlers);
    expect(stopped).toBe(started);
    expect((started as FakeSession).stopped).toBe(1);
    expect(toggleSpeechCapture(null, true, heard.handlers)).toBeNull();
    expect(heard.listening).toEqual([true]);
    expect(heard.reasons).toEqual([]);
  });

  it("runs start on an armed session", () => {
    const session = fakeSession();
    const heard = heardListener();
    expect(runSpeechStart(session, heard.handlers)).toBe(session);
    expect(session.started).toBe(1);
    expect(heard.listening).toEqual([true]);
    session.failStart = true;
    expect(runSpeechStart(session, heard.handlers)).toBeNull();
    expect(heard.reasons).toEqual(["Speech input could not start in this browser."]);
  });

  it("binds result, error, and end handlers", () => {
    const session = fakeSession();
    const heard = heardListener();
    bindSpeechRecognition(session, heard.handlers);
    session.onresult?.({ results: listLike(["bound"]) });
    session.onerror?.({});
    session.onend?.();
    expect(heard.transcripts).toEqual(["bound"]);
    expect(heard.reasons).toEqual(["Speech input stopped because the browser reported an error."]);
    expect(heard.listening).toEqual([false, false]);
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

function heardListener(): { handlers: SpeechListener; transcripts: string[]; listening: boolean[]; reasons: string[] } {
  const transcripts: string[] = [];
  const listening: boolean[] = [];
  const reasons: string[] = [];
  return {
    transcripts,
    listening,
    reasons,
    handlers: {
      onTranscript: (transcript) => {
        transcripts.push(transcript);
      },
      onListening: (value) => {
        listening.push(value);
      },
      onUnavailable: (reason) => {
        reasons.push(reason);
      },
    },
  };
}
