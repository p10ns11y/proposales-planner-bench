# Proposales planner redesign: reference pack

Method: the refero-design skill (research, then a reference lock, a decision ledger and an anti-slop check). Source: github.com/referodesign/refero_skill.

> **Source caveat.** The Refero and Mobbin connectors are both connected, but every call returned a paywall:
> Refero said `NO_SUBSCRIPTION` ("subscription is not active", refero.design/mcp/upgrade), and Mobbin said "Mobbin MCP requires a paid plan" (mobbin.com/pricing).
> That means this pack contains **no Refero style tokens and no Refero or Mobbin screens**. As the refero-design skill prescribes when its MCP is unavailable, it uses
> (a) the user's own Grok Bot screenshots as the primary visual source, with colours and geometry measured from the pixels,
> (b) public component references (Vercel AI Elements and shadcn/ui), captured headlessly, and
> (c) the skill's bundled craft rules (motion, colour, anti-AI-slop).
> If a Refero Pro or Mobbin paid plan is turned on later, re-run steps 1 to 3 of the brief and replace section 3.

---

## 1. Reference lock

```
Primary reference / direction: the Grok Bot desktop app's chat column (screens 11, 12, 13). This is a user-provided
  visual source and the explicit target ("Grok Bot inspired").
Preserve:
  1. Cool neutral greys, no warmth: canvas #F9F9F9, rail #F4F4F4, assistant bubble #ECECEC. No cream, no beige.
  2. Tone-on-tone surfaces separated by hairlines (#E2E2E2), not shadows. The UI is almost flat.
  3. Soft rounded assistant bubbles with an inner lighter "answer card" nested inside (screen 12). That nesting IS the
     in-chat generative-UI card pattern.
  4. Black (#070707) circular send button. Primary actions are black, not coloured.
  5. Coral (#FB3D50) is identity only: brand mark and avatar. It appears rarely, so it means something.
Borrow only:
  A. Vercel AI Elements "Tool"/"Artifact" header row (screens 02, 05): a structured block inside an assistant
     message with a one-line header (label + status badge) and a collapsible body. This becomes the offer group's header row
     ("3 offers · Stockholm · Thu 12 Nov · 40 guests").
  B. shadcn/ui Sheet anatomy (screen 03): right edge, title + one-line description, stacked labelled fields,
     sticky footer with one primary action. This becomes the "More" drawer.
Role rules:
  - Coral = brand mark + the single "Best match" marker on at most ONE card per reply. Never a button fill, never a
    background wash, never an error colour, never body text (#FB3D50 is only 3.4:1; coral text, where it exists at all, uses
    #D92D3F at 4.5:1).
  - Black = primary action only (Send, "Request this offer", drawer "Apply").
  - #ECECEC = assistant-authored surfaces only. User messages use the composer surface (#FAFAFA + hairline).
  - Status flags (Held, Expired, No food) stay monochrome chips with an icon. Meaning comes from icon + word, not hue.
Media strategy: no photography in v1 (the API has no venue photos). Use no fake venue images and no gradient blobs. Optionally
  show a 1:1 monogram tile (first letter, #EEEEEE, 40px, radius 10) as the card's leading slot.
Reject: the current cream canvas (#F3F0EA-ish) + serif body (textbook "calm editorial" AI slop); a <details> "More"
  accordion; a boxed Send/Speak/History button row; full-width table rows inside the chat; indigo/violet; emoji
  icons; decorative left stripes; a shadow on every card; a rainbow of status colours; Inter; "transition: all".
```

## 2. Tokens (commit these before coding)

### Colour roles (light, the only mode for v1)
| Token | Hex | Role | Source |
|---|---|---|---|
| `--bg-canvas` | `#F9F9F9` | Chat canvas, detail-view backdrop | measured, Grok Bot chat column |
| `--bg-rail` | `#F4F4F4` | Left rail / app chrome, drawer body | measured, Grok Bot sidebar |
| `--surface-assistant` | `#ECECEC` | Assistant bubble | measured (#ECECEC/#EBEBEC) |
| `--surface-card` | `#FAFAFA` | Inline offer card inside a bubble, user bubble, composer | measured, inner answer card / composer |
| `--surface-raised` | `#FFFFFF` | Drawer panel, full-screen detail sheet | craft: one step above canvas |
| `--surface-selected` | `#DEDEDE` | Selected/pressed chip, active list item | measured, selected tile |
| `--surface-chip` | `#EEEEEE` | Neutral chip, segmented tab pill | measured, tab pill |
| `--border-hairline` | `#E2E2E2` | 1px separators, card + composer outline | measured |
| `--border-strong` | `#D4D4D4` | Input borders in the drawer, hover outline | derived |
| `--text-primary` | `#151515` | Body, titles (17.3:1 on canvas) | measured |
| `--text-secondary` | `#666666` | Meta lines, "Held by…", captions (4.9:1 on #ECECEC) | measured #707070, darkened for AA |
| `--text-placeholder` | `#8A8A8A` | Composer placeholder only (3.3:1) | derived from #B5B5B5 for legibility |
| `--action-primary` | `#070707` | Send, primary buttons; text on it `#FFFFFF` (20:1) | measured send button |
| `--action-primary-hover` | `#2A2A2A` | Hover/pressed on primary | derived |
| `--accent-coral` | `#FB3D50` | Brand mark, single "Best match" dot/badge (graphics ≥3:1 only) | measured brand mark |
| `--accent-coral-text` | `#D92D3F` | Coral used as text, if ever (4.5:1) | derived for AA |
| `--danger-text` | `#B3261E` | Inline error copy (6.3:1); paired with an icon, never a fill | craft |
| `--scrim` | `rgba(10,10,10,0.32)` | Behind drawer / detail | craft |
| `--focus-ring` | `0 0 0 2px #F9F9F9, 0 0 0 4px #151515` | `:focus-visible` only | craft |

### Type
- **Typeface:** **Instrument Sans** (Google Fonts, OFL, variable wght 400–700, wdth 75–100; has `tnum` and `case`; checked in the font file).
  Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Not Inter, and no serif anywhere.
- Prices: `font-variant-numeric: tabular-nums; font-weight: 600`.

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| Display (empty-state question) | 28 / 34 | 500 | -0.02em |
| Detail title | 22 / 28 | 600 | -0.01em |
| Card title / drawer title | 17 / 24 | 600 | -0.005em |
| Body (bubbles, composer) | 15 / 22 | 400 | 0 |
| Meta (held by, date line, labels) | 13 / 18 | 500 | 0 |
| Caption / chip | 12 / 16 | 500 | 0.01em; no ALL CAPS |

(Measured: Grok Bot bubble text runs about 15px with an about 21px line pitch.)

### Spacing (4pt grid)
`4, 8, 12, 16, 20, 24, 32, 40, 56`.
- Bubble padding **14 / 16** (vertical / horizontal; measured 14–15 / 13–14).
- Inline card padding 12 / 14; gap between cards 8.
- Message gap: 8 within one turn, 24 between turns. Chat column max-width **720**, centred; side gutter 16 (measured 16).
- Composer: min-height 56, bottom inset 16, max-width 720. Drawer width **400** (desktop), 100vw below 640.
- Touch targets ≥ 44×44.

### Radius
| Element | Radius |
|---|---|
| Assistant / user bubble | **16** (measured about 14; rounded up for the brief's "soft") |
| Inline offer card inside bubble | **12** |
| Inner fields, chips' container rows | 10 |
| Chips, segmented tabs, composer (single-line) | **999** (pill) |
| Composer once it grows past 1 line | 24 |
| Drawer (inner left corners when inset) | 20 |
| Full-screen detail sheet (desktop, inset 12) | 20; mobile 0 |
| Send / icon buttons | 999 (32 send button; measured 28) |

### Elevation (mostly flat, as in the primary)
| Level | Value | Used on |
|---|---|---|
| e0 | none; tone + `1px var(--border-hairline)` | bubbles, inline cards at rest |
| e1 | `0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.04)` | inline card hover/focus, chips hover |
| e2 | `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)` | composer (floating over the scroll) |
| e3 | `-16px 0 48px rgba(0,0,0,.10)` + hairline left border | right drawer |
| e4 | `0 24px 80px rgba(0,0,0,.18)` | full-screen detail sheet (desktop inset) |

### Motion
```css
--dur-fast: 120ms;   /* hover, press, chip toggle, focus */
--dur-base: 200ms;   /* card enter, tab change, scrim */
--dur-slow: 320ms;   /* drawer, detail open */
--ease-out: cubic-bezier(0, 0, 0.2, 1);          /* enter */
--ease-in: cubic-bezier(0.4, 0, 1, 1);           /* exit */
--ease-emph: cubic-bezier(0.2, 0, 0, 1);         /* drawer/detail enter */
--spring-detail: { type: "spring", stiffness: 380, damping: 34 }  /* Motion layoutId morph */
```
- Drawer: enter `translateX(100%)→0` at 320ms emph, scrim fade 200ms; exit 220ms ease-in.
- Offer cards: fade + `translateY(8px)` 200ms ease-out, **40ms stagger**, max 4 staggered.
- **Card → detail (the one memorable move):** a shared-element morph (`layoutId` on the card container, title and price). The card grows into the full-screen sheet. Close reverses it into the same card at the same scroll position. Fall back to a fade+scale(0.98) at 200ms.
- Press: `scale(0.98)` 90ms. Never `transition: all`; animate transform/opacity only.
- `prefers-reduced-motion`: replace slides and morphs with a 150ms opacity fade.

---

## 3. Per-screen references (what to borrow, one line each)

| # | File | Source | Borrow |
|---|---|---|---|
| 11 | `11-grokbot-chat-column-primary.png` | Grok Bot desktop app (user screenshot, Oct 2026) | Bubble shape, padding, tone; floating composer with hairline, `+` left, mic + black round send right; "scroll to latest" round button. |
| 12 | `12-grokbot-inline-answer-card-primary.png` | Grok Bot desktop app (user screenshot) | **Card-inside-bubble**: a lighter #FAFAFA row with hairline inside the #ECECEC bubble, a leading letter tile and a trailing check. This is the template for each offer row. |
| 13 | `13-grokbot-right-panel-primary.png` | Grok Bot desktop app (user screenshot, cropped above personal content) | Right-panel header: round icon buttons (share, close) at top, centred identity, pill segmented tabs (#EEEEEE active). Use it for the detail view header and the drawer close button. |
| 01 | `01-ai-elements-conversation.png` | Vercel AI Elements, Conversation: https://ai-sdk.dev/elements/components/conversation | Auto-stick-to-bottom scroll + "jump to latest" button; user right / assistant left alignment rhythm. |
| 02 | `02-ai-elements-tool.png` | Vercel AI Elements, Tool: https://ai-sdk.dev/elements/components/tool | Header row + status badge (Pending / Running / Completed / Error) for the planner's "Searching Proposales…" step inside the reply. |
| 05 | `05-ai-elements-artifact.png` | Vercel AI Elements, Artifact: https://ai-sdk.dev/elements/components/artifact | Structured block with title, sub-line and right-aligned icon actions. This is the offer group's header ("3 offers…" + Compare / Open). |
| 06 | `06-ai-elements-prompt-input.png` | Vercel AI Elements, Prompt Input: https://ai-sdk.dev/elements/components/prompt-input | Composer anatomy: textarea + footer toolbar (attach, model/mode, submit). Use it to fold Speak/History into icon buttons. |
| 08 | `08-ai-elements-shimmer.png` | Vercel AI Elements, Shimmer: https://ai-sdk.dev/elements/components/shimmer | Text shimmer for the loading line ("Finding venues for 40 guests…") instead of a spinner. |
| 09 | `09-ai-elements-suggestion.png` | Vercel AI Elements, Suggestion: https://ai-sdk.dev/elements/components/suggestion | Pill suggestion chips for the empty state and the "refine" follow-ups (e.g. "Only with food", "Under 500 EUR"). |
| 03 | `03-shadcn-sheet-open.png` | shadcn/ui Sheet: https://ui.shadcn.com/docs/components/sheet | Right drawer anatomy: title + description, labelled stacked fields, sticky footer actions, ✕ top-right, scrim. |
| 04 | `04-shadcn-dialog-open.png` | shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog | Focus trap, Esc to close, aria labelling. Use the Dialog primitive for the full-screen detail and restyle it to full-bleed. |
| 07 | `07-shadcn-skeleton.png` | shadcn/ui Skeleton: https://ui.shadcn.com/docs/components/skeleton | Skeleton geometry for 2–3 placeholder offer cards (same height as real cards to avoid layout shift). |
| 10 | `10-grok-empty-state.png` | grok.com public landing (logged out) | Empty state: one centred question + a single wide pill composer + nothing else. |
| 00 | `00-before-*.png` | current live app | **Before** shots for the before/after comparison (cream + serif + `<details>` More + boxed buttons). |

Mobbin finds: none, because of the paywall described above. Planned queries, ready to run once it's unlocked: "AI chat reply with inline result cards", "right side sheet with form fields", "full-screen listing detail modal", "quote/offer comparison table".

---

## 4. Decision ledger
| Decision | Source | Role rule | Why |
|---|---|---|---|
| Cool grey canvas #F9F9F9 | Grok Bot (11) | canvas only | the user asked for Grok Bot feel; kills the current cream "editorial" slop |
| Offer rows nested inside the assistant bubble | Grok Bot (12) | #FAFAFA card on #ECECEC bubble | the user's "AG-UI cards inside the chat reply" |
| Group header + status | AI Elements Tool/Artifact (02, 05) | header row only | gives the reply a scannable summary line and a place for Compare |
| Right drawer for More | shadcn Sheet (03) + user brief | primary action black | the user asked for "expand from right side" |
| Full-screen detail with morph | shadcn Dialog (04) + user brief | Esc/✕ return to the same scroll spot | the user asked for "click opened … full screen … and closed" |
| Black send, coral only for brand + Best match | Grok Bot (11, 13) | coral never a fill | keeps the one accent meaningful |
| Instrument Sans | craft (typography), not Inter | one family | neutral grotesque with tnum for prices |

---

## 5. Anti-patterns to avoid (checked against the before state)
- Cream/beige canvas, serif body, or a "calm editorial" look (the current app). Never.
- A `<details>` "More" as a form, or settings inline in the page flow.
- Results as a full-width bordered list above the composer. They belong *inside* the assistant turn.
- Boxed "Send / Speak / History" text buttons. Use icon buttons in the composer (mic, history clock in the header).
- Coral as a button fill, a background wash or error red. Status colours in rainbow hues.
- Emoji icons (use Lucide), decorative left stripes, a shadow on every card, `transition: all`, spinners with no words.
- Showing "Expired" by colour alone. Use icon + word + a 60%-opacity price with `line-through`.
- Layout shift when results stream in. Skeletons must match final card height.
- Faking venue photos with gradients. No image until real media exists.
- Any personal data in demo fixtures. Use made-up venues only (Harbour House, Ridge Hall, Canal Loft are fine).

---

## 6. Build checklist (map to surfaces)

**Composer**
- [ ] Pill (999 radius) at 1 line, grows to radius 24, max 6 lines then scrolls; #FAFAFA + hairline + e2; floats 16px above bottom.
- [ ] Left `+` (opens drawer / attachments), right mic icon button + 32px black round send (disabled = #D4D4D4).
- [ ] Enter sends, Shift+Enter newline, Cmd/Ctrl+K focuses; placeholder "Describe the event: place, people, date, time".

**In-chat result cards**
- [ ] Assistant bubble #ECECEC r16, padding 14/16; one summary sentence, then a group header row (Artifact-style): "3 offers · Stockholm · Thu 12 Nov · 40 guests" + Compare + Open-all icons.
- [ ] Each offer = #FAFAFA r12 hairline row: monogram tile 40 / name (17/600) / meta line "Held by Quiet Court" (13/500 #666) / chips (Held = Lucide lock icon, Expired, No food) / price right-aligned tabular 600.
- [ ] At most one coral "Best match" dot+label per reply. Hover e1, press scale .98, whole card is one button with an aria-label.
- [ ] Stagger in at 40ms; keyboard ↑/↓ moves between cards, Enter opens detail.

**Right drawer (More)**
- [ ] 400px, #FFFFFF, e3, slides from the right in 320ms emph; scrim 0.32; Esc / ✕ / scrim click closes; focus trapped and returned to trigger.
- [ ] Title "Refine the brief" + one-line description; fields: city, guests (stepper), date, start/end time, budget, food required (switch), currency (segmented pill).
- [ ] Sticky footer: secondary "Reset", primary black "Apply". Applying posts a user-style chip message into the chat ("Updated: 40 guests, with food").

**Full-screen detail**
- [ ] Opens from a card with a shared-element morph; desktop is an inset 12px sheet r20 e4 over the scrim; mobile is true full-screen r0.
- [ ] Header (borrow 13): round ✕ left, share/copy right; title 22/600, price large tabular; flags; sections: Overview, Includes, Terms/validity, Held by; sticky bottom bar with primary black "File this brief" (draft path) + confirmation.
- [ ] Close (✕, Esc, back gesture, browser Back via URL `?offer=id`) returns to the same chat scroll position with the card focused.

**States**
- [ ] Empty: centred 28/500 "What are you planning?" + composer + 3 suggestion pills (borrow 09/10). No logo wall.
- [ ] Loading: Tool-style status row with shimmer text "Searching Proposales…" (08) then 2–3 skeleton cards of the final height (07).
- [ ] Sample-data mode: a quiet neutral chip in the group header, "Sample offers", with a tooltip explaining why. Never coral.
- [ ] No results: assistant bubble with one sentence + 2 refine pills ("Widen date", "Fewer guests").
- [ ] Error: assistant bubble with a `--danger-text` line + icon + "Try again" secondary button; keep the user's brief in the composer.
- [ ] Reduced motion, `:focus-visible` rings, 44px targets, 390px mobile, and 1280 / 1440 desktop screenshots for the before/after.

---

## References and credits

The reference list lives in the bench README under References.
