"use client";

import { ArrowDown, ArrowUp, Briefcase, CircleAlert, ListPlus, Mic, Plus } from "lucide-react";
import { LayoutGroup } from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { bestNonExpiredIndex } from "../contract/offer-group";
import { renderPart } from "../transport/render-part";
import { toOfferDataPart } from "../transport/ai-sdk-offers";
import type { PlannerViewEvent, ShellViewModel } from "../view-models/view-model";
import { offerGroupFromShell, offerPartFromRow } from "../view-models/offer-part";
import { fileBriefChoice, fileBriefLabel, fileBriefPressable, moreOpenedForEmail } from "./file-brief-state";
import { lcvInteract, lcvMachine, lcvStay } from "./lcv";
import { MoreDrawer } from "./more-drawer";
import { OfferDetail } from "./offer-detail";
import { speechButtonState, toggleSpeechCapture, type SpeechListener, type SpeechRecognitionLike } from "./speech-input";

type PlannerShellProps = {
  viewModel: ShellViewModel;
  onEvent: (event: PlannerViewEvent, pending?: "read" | "search" | "more") => void;
  historyControl: ReactNode;
  pendingKind?: "read" | "search" | "more" | null;
};

type Line = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const suggestions = [
  {
    label: "40 people in Stockholm, 12 Nov",
    text: "I need a place in Stockholm for 40 people on 12 November 2026, from 09:00 to 17:00.",
  },
  {
    label: "Day meeting for 12 in Gothenburg",
    text: "I need a place in Gothenburg for 12 people on 1 June 2026, from 09:00 to 17:00.",
  },
  {
    label: "Offsite with rooms for 20",
    text: "I need a place in Stockholm for 20 people on 12 November 2026, from 09:00 to 17:00, with 20 rooms.",
  },
];

export function PlannerShell({ viewModel, onEvent, historyControl, pendingKind = null }: PlannerShellProps) {
  const [draft, setDraft] = useState("");
  const [grown, setGrown] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [jump, setJump] = useState(false);
  const [pendingTick, setPendingTick] = useState(0);
  const [slowTick, setSlowTick] = useState(-1);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreDraft, setMoreDraft] = useState<string | null>(null);
  const [moreNote, setMoreNote] = useState<string | null>(null);
  const [focusEmail, setFocusEmail] = useState(false);
  const [detailNote, setDetailNote] = useState<string | null>(null);
  const [holdEmpty, setHoldEmpty] = useState(false);
  const idRef = useRef(1);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const moreOpener = useRef<HTMLButtonElement | null>(null);
  const speechSession = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speechReason, setSpeechReason] = useState<string | null>(null);
  const stick = useRef(true);
  const scrollLock = useRef<number | null>(null);
  const previousOpen = useRef<string | null>(null);
  const pushedOffer = useRef<string | null>(null);
  const heldDraft = useRef("");
  const lastKind = useRef<"read" | "search">("read");

  const pending = viewModel.busy && pendingKind !== null;
  const moreLine = viewModel.busy || viewModel.errorText !== null ? null : (moreDraft ?? moreNote);
  const slow = pending && slowTick === pendingTick;
  const empty =
    holdEmpty ||
    (lines.length === 0 && !pending && viewModel.phase === "capture" && viewModel.errorText === null);
  const group = holdEmpty ? null : offerGroupFromShell(viewModel);
  const part = group === null ? null : toOfferDataPart(group);
  const bestIndex = bestNonExpiredIndex(viewModel.rows);
  const openIndex = viewModel.openRow === null ? -1 : viewModel.rows.findIndex((row) => row.venueName === viewModel.openRow?.venueName);
  const openOffer = viewModel.openRow === null ? null : offerPartFromRow(viewModel.openRow, openIndex === bestIndex && bestIndex >= 0);
  const includeExtras = (group?.offers.some((offer) => offer.extras !== 0) ?? false) || (openOffer?.extras ?? 0) !== 0;

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        composerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!viewModel.busy) {
      return;
    }
    const timer = window.setTimeout(() => setSlowTick(pendingTick), 8000);
    return () => window.clearTimeout(timer);
  }, [viewModel.busy, pendingTick]);

  useEffect(() => {
    if (viewModel.busy || viewModel.errorText === null || heldDraft.current === "") {
      return;
    }
    setDraft(heldDraft.current);
  }, [viewModel.busy, viewModel.errorText]);

  useEffect(() => {
    const name = viewModel.openRow === null ? null : offerKey(viewModel.openRow.proposalUuid, viewModel.openRow.venueName);
    if (name !== null) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("offer") !== name) {
        url.searchParams.set("offer", name);
        window.history.pushState({ offer: name }, "", hrefOf(url));
        pushedOffer.current = name;
      }
      return;
    }
    const closed = pushedOffer.current;
    if (closed === null) {
      return;
    }
    pushedOffer.current = null;
    if (historyOffer() !== closed) {
      return;
    }
    window.history.back();
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.searchParams.get("offer") !== closed) {
        return;
      }
      url.searchParams.delete("offer");
      window.history.replaceState({}, "", hrefOf(url));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewModel.openRow]);

  useEffect(() => {
    function onPop() {
      const offer = new URL(window.location.href).searchParams.get("offer");
      if (offer === null && viewModel.openRow !== null) {
        pushedOffer.current = null;
        onEvent({ type: "rowClosed" });
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onEvent, viewModel.openRow]);

  useLayoutEffect(() => {
    const element = composerRef.current;
    if (element === null) {
      return;
    }
    element.style.height = "0px";
    const next = Math.min(element.scrollHeight, 22 * 6);
    element.style.height = `${next}px`;
    setGrown(element.scrollHeight > 46);
  }, [draft]);

  useLayoutEffect(() => {
    const current = viewModel.openRow?.venueName ?? null;
    const previous = previousOpen.current;
    previousOpen.current = current;
    if (previous !== null && current === null) {
      document.querySelector<HTMLButtonElement>(`[data-offer-card][data-venue="${cssEscape(previous)}"]`)?.focus();
    }
  }, [viewModel.openRow]);

  useLayoutEffect(() => {
    const element = threadRef.current;
    if (element === null) {
      return;
    }
    if (viewModel.openRow !== null) {
      if (scrollLock.current === null) {
        scrollLock.current = element.scrollTop;
      }
      element.scrollTop = scrollLock.current;
      return;
    }
    scrollLock.current = null;
    if (stick.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines, pending, viewModel.ask, viewModel.rows, viewModel.notice, viewModel.openRow, viewModel.draftConfirmation]);

  function pushTurn(userText: string) {
    const live = viewModel.ask;
    setLines((current) => {
      const next = [...current];
      const lastAssistant = [...next].reverse().find((line) => line.role === "assistant");
      if (live !== "" && lastAssistant?.text !== live) {
        next.push({ id: idRef.current++, role: "assistant", text: live });
      }
      next.push({ id: idRef.current++, role: "user", text: userText });
      return next;
    });
  }

  function submitText(text: string, kind: "read" | "search") {
    const trimmed = text.trim();
    if (trimmed === "" || viewModel.busy || !viewModel.ready) {
      return;
    }
    setHoldEmpty(false);
    setMoreDraft(null);
    setMoreNote(null);
    pushTurn(trimmed);
    lastKind.current = kind;
    setPendingTick((value) => value + 1);
    heldDraft.current = trimmed;
    setDraft("");
    onEvent({ type: "composerSubmitted", text: trimmed }, kind);
  }

  function submitDraft() {
    const kind = viewModel.phase === "favorites" || viewModel.phase === "results" ? "search" : "read";
    submitText(draft, kind);
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  }

  function onThreadScroll() {
    const element = threadRef.current;
    if (element === null) {
      return;
    }
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stick.current = distance < 48;
    setJump(distance >= 48);
  }

  function openMore(event: MouseEvent<HTMLButtonElement>) {
    moreOpener.current = event.currentTarget;
    setFocusEmail(false);
    setMoreOpen(true);
  }

  function setMore(open: boolean) {
    setMoreOpen(open);
    if (!open) {
      setFocusEmail(false);
    }
  }

  function fileBrief() {
    const choice = fileBriefChoice({
      filed: viewModel.filed,
      busy: viewModel.busy,
      ready: viewModel.ready,
      email: viewModel.more.contactEmail,
    });
    if (choice === "ignore") {
      return;
    }
    if (choice === "ask-email") {
      setFocusEmail(true);
      setDetailNote(moreOpenedForEmail);
      setMoreOpen(true);
      return;
    }
    setFocusEmail(false);
    setDetailNote(null);
    setLines((current) => [...current, { id: idRef.current++, role: "user", text: "File this brief" }]);
    onEvent({ type: "composerSubmitted", text: "file" });
  }

  function newChat() {
    setLines([]);
    setDraft("");
    setHoldEmpty(true);
    setMoreOpen(false);
    setMoreDraft(null);
    setMoreNote(null);
    setFocusEmail(false);
    setDetailNote(null);
    onEvent({ type: "sessionReset" });
  }

  const showLive = !holdEmpty && (pending || (!empty && liveIsNew(lines, viewModel.ask, viewModel)));
  const labelled = empty || (showLive && !pending && viewModel.askLabelsComposer);
  const speech = speechButtonState({
    supported: viewModel.speechAvailable,
    listening,
    unavailable: speechReason,
    busy: viewModel.busy,
    ready: viewModel.ready,
  });
  const speechListener: SpeechListener = {
    onTranscript: (transcript) => setDraft(transcript),
    onListening: setListening,
    onUnavailable: setSpeechReason,
  };

  function onSpeech() {
    speechSession.current = toggleSpeechCapture(speechSession.current, listening, speechListener);
  }
  const filePressable = fileBriefPressable({
    busy: viewModel.busy,
    filed: viewModel.filed,
    ready: viewModel.ready,
  });
  const showResultsFile = viewModel.phase === "results" && viewModel.rows.length > 0;

  return (
    <LayoutGroup>
      <div className="planner-frame" data-phase={viewModel.phase}>
        <a
          className="planner-skip"
          href="#composer"
          {...lcvInteract({
            event: "navigate",
            from: chatState(viewModel.phase),
            success: "#composer",
            fail: chatState(viewModel.phase),
            interrupted: chatState(viewModel.phase),
          })}
        >
          Skip to the composer
        </a>
        <nav className="planner-rail" aria-label="Planner">
          <span className="planner-brand" title="Planner bench">
            <Briefcase aria-hidden="true" />
          </span>
          <button type="button" className="planner-rail-button" aria-label="New chat" {...newChatEdge(viewModel.phase)} onClick={newChat}>
            <Plus aria-hidden="true" />
          </button>
        </nav>
        <div className="planner-main" {...lcvMachine("chat", chatState(viewModel.phase), chatStates)}>
          <header className="planner-header">
            <span className="planner-mobile-mark" aria-hidden="true">
              <Briefcase />
            </span>
            <div className="planner-header-actions">
              <button type="button" className="planner-pill" aria-label="New chat" {...newChatEdge(viewModel.phase)} onClick={newChat}>
                <Plus aria-hidden="true" />
                <span className="planner-pill-label">New chat</span>
              </button>
              {historyControl}
              <button
                type="button"
                className="planner-pill planner-pill-strong planner-detail-trigger"
                data-must-show="more"
                aria-label="Add details"
                title="Add details"
                {...openMoreEdge()}
                onClick={openMore}
              >
                <ListPlus aria-hidden="true" />
                <span className="planner-pill-label">Add details</span>
              </button>
            </div>
          </header>
          <div className="planner-thread" ref={threadRef} onScroll={onThreadScroll}>
            <div className="planner-column">
              {empty ? (
                <div className="planner-empty">
                  <h1 className="planner-display" id="planner-ask">
                    <label htmlFor="composer">{holdEmpty ? "What are you planning?" : viewModel.ask}</label>
                  </h1>
                  <div className="planner-suggestions">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.label}
                        type="button"
                        className="planner-suggestion"
                        disabled={viewModel.busy || !viewModel.ready}
                        {...lcvInteract({
                          event: "suggest",
                          from: chatState(viewModel.phase),
                          success: "chat:submit",
                          fail: chatState(viewModel.phase),
                          interrupted: chatState(viewModel.phase),
                        })}
                        onClick={() => submitText(suggestion.text, "read")}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="planner-log">
                  {lines.map((line) =>
                    line.role === "user" ? (
                      <div key={line.id} className="planner-user">
                        <div className="planner-user-bubble">
                          <p className="planner-text">{line.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={line.id} className="planner-assistant">
                        <div className="planner-assistant-bubble">
                          <p className="planner-text">{line.text}</p>
                        </div>
                      </div>
                    ),
                  )}
                  {showLive ? (
                    <div className="planner-assistant">
                      <div className="planner-assistant-bubble">
                        {pending ? (
                          <Pending kind={pendingKind ?? "read"} slow={slow} />
                        ) : (
                          <LiveCopy
                            viewModel={viewModel}
                            showFile={showResultsFile}
                            concealFile={viewModel.openRow !== null}
                            fileLabel={fileBriefLabel(viewModel.filed)}
                            filePressable={filePressable}
                            onFile={fileBrief}
                            onConfirm={() => {
                              pushTurn("Yes");
                              lastKind.current = "search";
                              setPendingTick((value) => value + 1);
                              onEvent({ type: "briefConfirmed" }, "search");
                            }}
                            onSkip={() => {
                              pushTurn("Skip");
                              lastKind.current = "search";
                              setPendingTick((value) => value + 1);
                              onEvent({ type: "favoritesSubmitted", text: "skip" }, "search");
                            }}
                            onRefine={(text) => {
                              setDraft(text);
                              composerRef.current?.focus();
                            }}
                            onRetry={() => submitText(heldDraft.current, lastKind.current)}
                          />
                        )}
                      </div>
                      {pending && pendingKind === "search" ? <SkeletonGroup /> : null}
                      {!pending && moreLine ? (
                        <p className="planner-more-update" role="status" data-more-update>
                          {moreLine}
                        </p>
                      ) : null}
                      {!pending && part ? (
                        renderPart(part, {
                          hiddenCount: viewModel.hiddenCount,
                          openName: viewModel.openRow?.venueName ?? null,
                          onOpen: (venueName) => onEvent({ type: "rowOpened", venueName }),
                          onShowMore: () => onEvent({ type: "showMore" }),
                        })
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          {jump ? (
            <button
              type="button"
              className="planner-jump"
              aria-label="Latest messages"
              {...lcvStay("jump-latest", chatState(viewModel.phase))}
              onClick={() => {
                const element = threadRef.current;
                if (element === null) {
                  return;
                }
                element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
              }}
            >
              <ArrowDown />
            </button>
          ) : null}
          <div className="planner-dock">
            {speech.shown === false && speech.reason !== null ? (
              <p className="planner-speech-status" role="status" aria-label={speech.reason} data-speech-state="unavailable">
                {speech.reason}
              </p>
            ) : null}
            <form
              className="planner-composer"
              data-must-show="composer"
              data-grown={grown ? "true" : "false"}
              onSubmit={(event) => {
                event.preventDefault();
                submitDraft();
              }}
            >
              <button
                type="button"
                className="planner-icon-button planner-detail-trigger"
                aria-label="Add details"
                title="Add details"
                {...openMoreEdge()}
                onClick={openMore}
              >
                <ListPlus aria-hidden="true" />
              </button>
              <textarea
                id="composer"
                ref={composerRef}
                name="composer"
                rows={1}
                value={draft}
                placeholder={viewModel.composerPlaceholder}
                enterKeyHint="send"
                inputMode={viewModel.inputMode}
                autoComplete={viewModel.autoComplete}
                disabled={!viewModel.ready}
                aria-label={labelled ? undefined : viewModel.ask}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
              />
              {speech.shown ? (
                <button
                  type="button"
                  className="planner-icon-button"
                  aria-label={speech.name}
                  aria-pressed={speech.pressed}
                  disabled={speech.disabled}
                  data-speech-state={speech.pressed ? "listening" : "ready"}
                  {...lcvInteract({
                    event: "dictate",
                    from: chatState(viewModel.phase),
                    success: "composer:dictate",
                    fail: chatState(viewModel.phase),
                    interrupted: chatState(viewModel.phase),
                  })}
                  onClick={onSpeech}
                >
                  <Mic aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="submit"
                className="planner-send"
                aria-label="Send"
                disabled={viewModel.busy || !viewModel.ready || draft.trim() === ""}
                {...sendEdge(viewModel)}
              >
                <span className="planner-send-face">
                  <ArrowUp aria-hidden="true" />
                </span>
              </button>
            </form>
          </div>
        </div>
        <MoreDrawer
          more={viewModel.more}
          moreStamp={viewModel.moreStamp}
          currency={viewModel.budgetCurrency}
          open={moreOpen}
          focusEmail={focusEmail}
          disabled={viewModel.busy || !viewModel.ready}
          onOpenChange={setMore}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (viewModel.openRow !== null) {
              document.querySelector<HTMLElement>("[data-lcv-event=file-brief]")?.focus();
              return;
            }
            moreOpener.current?.focus();
          }}
          onEvent={(event) => {
            if (event.type === "moreEdited") {
              onEvent(event, "more");
              return;
            }
            onEvent(event);
          }}
          onApplied={(line) => {
            if (line === "Nothing changed") {
              setMoreDraft(null);
              setMoreNote(line);
              return;
            }
            setMoreNote(null);
            setMoreDraft(line);
            setDetailNote(null);
          }}
        />
        <OfferDetail
          offer={holdEmpty ? null : openOffer}
          includeExtras={includeExtras}
          contextChips={viewModel.contextChips}
          filingMessage={viewModel.filingMessage}
          errorText={viewModel.errorText}
          whyMore={detailNote}
          filed={viewModel.filed}
          active={!moreOpen}
          pressable={filePressable}
          onClose={() => onEvent({ type: "rowClosed" })}
          onFile={fileBrief}
        />
        <div
          hidden
          data-lcv-marker="detail"
          {...lcvMachine("detail", openOffer ? "detail:open" : "detail:closed", "detail:closed detail:open")}
        />
        <div
          hidden
          data-lcv-marker="more"
          {...lcvMachine("more", moreOpen ? "more:open" : "more:closed", "more:closed more:open")}
        />
      </div>
    </LayoutGroup>
  );
}

function LiveCopy({
  viewModel,
  showFile,
  concealFile,
  fileLabel,
  filePressable,
  onFile,
  onConfirm,
  onSkip,
  onRefine,
  onRetry,
}: {
  viewModel: ShellViewModel;
  showFile: boolean;
  concealFile: boolean;
  fileLabel: string;
  filePressable: boolean;
  onFile: () => void;
  onConfirm: () => void;
  onSkip: () => void;
  onRefine: (text: string) => void;
  onRetry: () => void;
}) {
  const factsMarked = viewModel.phase === "results" || viewModel.showFacts;
  const notice = viewModel.notice !== null && viewModel.notice !== viewModel.ask ? viewModel.notice : null;
  return (
    <>
      {notice ? (
        <p className="planner-meta" role="status">
          {notice}
        </p>
      ) : null}
      {viewModel.draftConfirmation ? (
        <p className="planner-meta" role="status">
          {viewModel.draftConfirmation}
        </p>
      ) : null}
      <h2
        className="planner-text"
        data-must-show={factsMarked ? "facts" : undefined}
        {...askMarks(viewModel)}
      >
        {viewModel.askLabelsComposer ? <label htmlFor="composer">{viewModel.ask}</label> : viewModel.ask}
      </h2>
      {viewModel.showFacts && viewModel.factsSentence !== viewModel.ask ? (
        <p className="planner-text" data-must-show="facts">
          {viewModel.confirmRuns.map((run, index) =>
            run.kind === "fact" ? (
              <span key={`${run.name}-${index}`} data-lcv="must-show" data-lcv-fact={run.name}>
                {run.text}
              </span>
            ) : (
              <span key={`join-${index}`}>{run.text}</span>
            ),
          )}
        </p>
      ) : null}
      {viewModel.showConfirm ? (
        <div className="planner-actions">
          <button
            type="button"
            className="planner-primary"
            disabled={viewModel.busy || !viewModel.ready}
            {...lcvInteract({
              event: "confirm-brief",
              from: "chat:confirm",
              success: "chat:favorites",
              fail: "chat:confirm",
              interrupted: "chat:confirm",
            })}
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      ) : null}
      {viewModel.showFavorites ? (
        <div className="planner-actions">
          <button
            type="button"
            className="planner-secondary"
            disabled={viewModel.busy || !viewModel.ready}
            {...lcvInteract({
              event: "skip",
              from: "chat:favorites",
              success: "chat:results",
              fail: "chat:favorites",
              interrupted: "chat:favorites",
            })}
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      ) : null}
      {showFile ? (
        <div
          className="planner-actions"
          aria-hidden={concealFile ? true : undefined}
          style={concealFile ? { visibility: "hidden" } : undefined}
        >
          <button
            type="button"
            className="planner-secondary"
            disabled={!filePressable || concealFile}
            tabIndex={concealFile ? -1 : undefined}
            {...lcvStay("file-brief", "chat:results")}
            onClick={onFile}
          >
            {fileLabel}
          </button>
        </div>
      ) : null}
      {viewModel.phase === "results" && viewModel.rows.length === 0 ? (
        <div className="planner-suggestions">
          <button type="button" className="planner-suggestion" {...lcvStay("refine", "chat:results")} onClick={() => onRefine("Widen the date")}>
            Widen the date
          </button>
          <button type="button" className="planner-suggestion" {...lcvStay("refine", "chat:results")} onClick={() => onRefine("Fewer people")}>
            Fewer people
          </button>
        </div>
      ) : null}
      {viewModel.errorText ? (
        <div role="alert">
          <p className="planner-danger">
            <CircleAlert aria-hidden="true" />
            <span>{viewModel.errorText}</span>
          </p>
          <div className="planner-actions">
            <button type="button" className="planner-secondary" {...lcvStay("retry", chatState(viewModel.phase))} onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Pending({ kind, slow }: { kind: "read" | "search" | "more"; slow: boolean }) {
  const label = pendingLabel(kind, slow);
  return (
    <>
      <p className="planner-shimmer" role="status">
        {label}
      </p>
      {kind === "search" ? <p className="planner-meta">Ranking places…</p> : null}
    </>
  );
}

function pendingLabel(kind: "read" | "search" | "more", slow: boolean): string {
  if (kind === "more") {
    return slow ? "Still updating…" : "Updating the brief…";
  }
  if (kind === "search") {
    return slow ? "Still searching…" : "Searching Proposales…";
  }
  return slow ? "Still reading…" : "Reading the brief…";
}

function SkeletonGroup() {
  return (
    <div className="planner-offer-group" aria-hidden="true">
      <div className="planner-skeleton" />
      <div className="planner-skeleton" />
      <div className="planner-skeleton" />
    </div>
  );
}

function liveIsNew(lines: Line[], live: string, viewModel: ShellViewModel): boolean {
  if (
    viewModel.rows.length > 0 ||
    viewModel.showConfirm ||
    viewModel.showFavorites ||
    viewModel.notice !== null ||
    viewModel.draftConfirmation !== null ||
    viewModel.errorText !== null ||
    viewModel.phase === "results"
  ) {
    return true;
  }
  const lastAssistant = [...lines].reverse().find((line) => line.role === "assistant");
  return lastAssistant?.text !== live;
}

const chatStates = "chat:capture chat:confirm chat:favorites chat:results";

function chatState(phase: ShellViewModel["phase"]): string {
  return `chat:${phase}`;
}

function sendSuccess(phase: ShellViewModel["phase"]): string {
  if (phase === "capture") {
    return "chat:confirm";
  }
  if (phase === "favorites") {
    return "chat:results";
  }
  return chatState(phase);
}

function newChatEdge(phase: ShellViewModel["phase"]) {
  const state = chatState(phase);
  return lcvInteract({
    event: "new-chat",
    from: state,
    success: "chat:capture",
    fail: state,
    interrupted: state,
  });
}

function openMoreEdge() {
  return lcvInteract({
    event: "open-more",
    from: "more:closed",
    success: "more:open",
    fail: "more:closed",
    interrupted: "more:closed",
  });
}

function sendEdge(viewModel: ShellViewModel) {
  const state = chatState(viewModel.phase);
  if (viewModel.askMark === "budget-basis") {
    return lcvInteract({
      event: "answer-basis",
      from: state,
      success: state,
      fail: state,
      interrupted: state,
    });
  }
  return lcvInteract({
    event: "send",
    from: state,
    success: sendSuccess(viewModel.phase),
    fail: state,
    interrupted: state,
  });
}

function askMarks(viewModel: ShellViewModel): {
  "data-lcv"?: "must-show";
  "data-lcv-fact"?: "budget-basis";
  "data-lcv-reply"?: "sentence";
  "data-lcv-count"?: "reply";
} {
  if (viewModel.askMark === "budget-basis") {
    return { "data-lcv": "must-show", "data-lcv-fact": "budget-basis" };
  }
  return replyMarks(viewModel.phase);
}

function replyMarks(phase: ShellViewModel["phase"]): {
  "data-lcv"?: "must-show";
  "data-lcv-reply"?: "sentence";
  "data-lcv-count"?: "reply";
} {
  if (phase !== "results") {
    return {};
  }
  return { "data-lcv": "must-show", "data-lcv-reply": "sentence", "data-lcv-count": "reply" };
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

function offerKey(proposalUuid: string, venueName: string): string {
  return proposalUuid === "" ? venueName : proposalUuid;
}

function historyOffer(): string | null {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null) {
    return null;
  }
  const offer = Reflect.get(state, "offer");
  return typeof offer === "string" ? offer : null;
}

function hrefOf(url: URL): string {
  const search = url.searchParams.toString();
  return `${url.pathname}${search === "" ? "" : `?${search}`}${url.hash}`;
}
