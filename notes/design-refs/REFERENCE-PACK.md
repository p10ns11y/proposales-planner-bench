# Proposales planner redesign: reference pack

This pack locked the visual direction before code: a reference lock, the tokens, a decision ledger, and an anti-slop check. The verdicts are the app on main at `346363e`.

**19 shipped, 12 changed, 1 dropped, out of 32.** The [ledger](#verdicts) is the full list. The [before and after](#before-and-after) pairs the shots.

---

## 1. Reference lock

```
Primary reference / direction: the Grok Bot desktop chat column.
Preserve:
  1. Cool neutral greys, no warmth: canvas #F9F9F9, rail #F4F4F4, assistant bubble #ECECEC. No cream, no beige.
  2. Tone-on-tone surfaces separated by hairlines (#E2E2E2), not shadows. The UI is almost flat.
  3. Soft rounded assistant bubbles with an inner lighter answer card nested inside. That nesting is the
     in-chat generative-UI card pattern.
  4. Black (#070707) circular send button. Primary actions are black, not coloured.
  5. Coral (#FB3D50) is identity only: brand mark and avatar. It appears rarely, so it means something.
Borrow only:
  A. A structured block inside an assistant message with a one-line header (label + status badge) and a
     collapsible body. This becomes the offer group's header row
     ("3 offers · Stockholm · Thu 12 Nov · 40 guests").
  B. Right-edge sheet anatomy: title + one-line description, stacked labelled fields,
     sticky footer with one primary action. This becomes the More drawer.
Role rules:
  - Coral = brand mark + the single "Best match" marker on at most ONE card per reply. Never a button fill, never a
    background wash, never an error colour, never body text (#FB3D50 is only 3.4:1; coral text, where it exists at all, uses
    #D92D3F at 4.5:1).
  - Black = primary action only (Send, "Request this offer", drawer "Apply").
  - #ECECEC = assistant-authored surfaces only. User messages use the composer surface (#FAFAFA + hairline).
  - Status flags (Held, Expired, No food) stay monochrome chips with an icon. Meaning comes from icon + word, not hue.
Media strategy: no photography in v1 (the API has no venue photos). Use no fake venue images and no gradient blobs. Optionally
  show a 1:1 monogram tile (first letter, #EEEEEE, 40px, radius 10) as the card's leading slot.
Reject: the current cream canvas (#F3F0EA-ish) + serif body (textbook "calm editorial" SI slop); a <details> "More"
  accordion; a boxed Send/Speak/History button row; full-width table rows inside the chat; indigo/violet; emoji
  icons; decorative left stripes; a shadow on every card; a rainbow of status colours; Inter; "transition: all".
```

**Shipped** for the greys, the hairline, the black send, coral on the mark and one Best match, and the rejects (no cream canvas, no serif, no `<details>`, no Inter). **Changed:** the ranked rows sit under the reply, in their own grey block, rather than inside the assistant bubble. See the ledger.

## 2. Tokens (commit these before coding)

### Colour roles (light, the only mode for v1)
| Token | Hex | Role | Source |
|---|---|---|---|
| `--bg-canvas` | `#F9F9F9` | Chat canvas, detail-view backdrop | Grok Bot chat column |
| `--bg-rail` | `#F4F4F4` | Left rail / app chrome, drawer body | Grok Bot sidebar |
| `--surface-assistant` | `#ECECEC` | Assistant bubble | measured (#ECECEC/#EBEBEC) |
| `--surface-card` | `#FAFAFA` | Inline offer card inside a bubble, user bubble, composer | inner answer card / composer |
| `--surface-raised` | `#FFFFFF` | Drawer panel, full-screen detail sheet | one step above canvas |
| `--surface-selected` | `#DEDEDE` | Selected/pressed chip, active list item | selected tile |
| `--surface-chip` | `#EEEEEE` | Neutral chip, segmented tab pill | tab pill |
| `--border-hairline` | `#E2E2E2` | 1px separators, card + composer outline | measured |
| `--border-strong` | `#D4D4D4` | Input borders in the drawer, hover outline | derived |
| `--text-primary` | `#151515` | Body, titles (17.3:1 on canvas) | measured |
| `--text-secondary` | `#666666` | Meta lines, "Held by…", captions (4.9:1 on #ECECEC) | measured #707070, darkened for AA |
| `--text-placeholder` | `#8A8A8A` | Composer placeholder only (3.3:1) | derived from #B5B5B5 for legibility |
| `--action-primary` | `#070707` | Send, primary buttons; text on it `#FFFFFF` (20:1) | send button |
| `--action-primary-hover` | `#2A2A2A` | Hover/pressed on primary | derived |
| `--accent-coral` | `#FB3D50` | Brand mark, single "Best match" dot/badge (graphics ≥3:1 only) | brand mark |
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

(Grok Bot bubble text runs about 15px with an about 21px line pitch.)

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
| Assistant / user bubble | **16** (measured about 14; rounded up for a soft corner) |
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

**Shipped** for Instrument Sans, the colour tokens other than the placeholder, the type scale other than the drawer title, the 720 column, the 400 drawer from 640px up, the elevation values, and the duration tokens. **Changed:** placeholder is `#6e6e6e`; the drawer title is 22/28; the user bubble keeps a 2px tail; the drawer does not slide in. See the ledger.

---

## 3. What to borrow

- Chat column: bubble shape, padding, and tone; a floating composer with a hairline, a plus on the left, and a mic plus a black round send on the right; a round control that jumps to the latest message.
- Nested answer card: a lighter `#FAFAFA` row with a hairline inside the `#ECECEC` bubble, a leading letter tile, and a trailing mark. This is the template for each offer row.
- Right panel: round icon buttons (share, close) at the top, a centred identity, and pill segmented tabs (`#EEEEEE` when active). Use that for the detail header and the drawer close button.
- Conversation rhythm: stick to the bottom of the thread, with a jump-to-latest control. The person sits on the right; the assistant sits on the left.
- Tool header: one line plus a status (Pending / Running / Completed / Error) for the "Searching Proposales…" step inside the reply.
- Artifact block: a title, a sub-line, and right-aligned icon actions. This is the offer group's header ("3 offers…" plus Compare / Open).
- Prompt input: a textarea and a footer toolbar (attach, mode, submit). Speak and history fold into icon buttons.
- Loading: a text treatment for "Finding venues for 40 guests…" and skeleton cards that match the height of a real card.
- Suggestions: pill chips for the empty state and short follow-ups ("Only with food", "Under 500 EUR").
- Sheet: a right drawer with a title, a one-line description, labelled stacked fields, a sticky footer, a close control, and a scrim.
- Dialog: a focus trap, Escape to close, and an accessible name. The detail view uses that primitive and goes full bleed on a phone.
- Empty state: one centred question, one wide pill composer, and nothing else.
- Before comparison: the previous shell, with its cream canvas, serif type, disclosure for More, and boxed buttons.

**Shipped** for the composer icons, the jump-to-latest control, the history clock in the header, and the sheet anatomy. **Dropped:** a four-state tool header (Pending / Running / Completed / Error). The search step is one sentence. See the ledger.

---

## 4. Decision ledger
| Decision | Source | Role rule | Why |
|---|---|---|---|
| Cool grey canvas #F9F9F9 | Grok Bot chat column | canvas only | matches that column and drops the cream editorial canvas |
| Offer rows nested inside the assistant bubble | Grok Bot nested answer card | #FAFAFA card on #ECECEC bubble | the ranked rows belong inside the assistant reply |
| Group header + status | Tool / artifact header | header row only | gives the reply a scannable summary line and a place for Compare |
| Right drawer for More | Sheet anatomy | primary action black | More expands from the right |
| Full-screen detail with morph | Dialog primitive | Esc/✕ return to the same scroll spot | a result opens full screen and closes back to the chat |
| Black send, coral only for brand + Best match | Grok Bot chat column | coral never a fill | keeps the one accent meaningful |
| Instrument Sans | craft (typography), not Inter | one family | neutral grotesque with tnum for prices |

**Shipped** for the canvas, the nested-card colours, the black send, and Instrument Sans. **Changed:** More is a right drawer, and its fields are the extras below, not the city and guest controls. The detail sheet opens over a scrim; the shared move is the title and the price.

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

**Shipped.** Fixtures stay on those three venues. Status uses an icon, a word, and a struck price. There is no venue photography.

---

## 6. Build checklist (map to surfaces)

**Composer**
- [x] Pill (999 radius) at 1 line, grows to radius 24, max 6 lines then scrolls; #FAFAFA + hairline + e2; floats 16px above bottom. **Shipped.** [globals.css](../../src/app/globals.css) lines 378–407. The field stops at six lines in [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 153–161.
- [x] Left `+` (opens drawer / attachments), right mic icon button + 32px black round send (disabled = #D4D4D4). **Shipped.** The plus, the mic, and the send face are in [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 414–457. The 32px face and the disabled grey are in [globals.css](../../src/app/globals.css) lines 454–486. History is a clock in the header, not in this row: [history-view.tsx](../../src/views/history-view.tsx) lines 22–36.
- [x] Enter sends, Shift+Enter newline, Cmd/Ctrl+K focuses; placeholder "Describe the event: place, people, date, time". **Shipped.** [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 86–88 and 223–227. The placeholder string is in [selectors.ts](../../src/view-models/selectors.ts) line 23.

**In-chat result cards**
- [ ] Assistant bubble #ECECEC r16, padding 14/16; one summary sentence, then a group header row: "3 offers · Stockholm · Thu 12 Nov · 40 guests" + Compare + Open-all icons. **Changed.** The bubble and the summary line landed ([globals.css](../../src/app/globals.css) lines 284–291, [selectors.ts](../../src/view-models/selectors.ts) lines 182–200). The rows are a block under the bubble, not inside it ([planner-shell.tsx](../../src/views/planner-shell.tsx) lines 345–380, [offer-group.tsx](../../src/views/offer-group.tsx) lines 73–124). Compare and Open all keep their words beside the icons.
- [ ] Each offer = #FAFAFA r12 hairline row: monogram tile 40 / name (17/600) / meta line "Held by Quiet Court" (13/500 #666) / chips (Held = Lucide lock icon, Expired, No food) / price right-aligned tabular 600. **Changed.** The tile, the name, the "Held by" line, and the price landed ([offer-group.tsx](../../src/views/offer-group.tsx) lines 226–251, [globals.css](../../src/app/globals.css) lines 793–850). There is no Held chip and no lock icon. Expired and No food use a clock and a utensils icon ([offer-copy.ts](../../src/views/offer-copy.ts) lines 11–16, [offer-group.tsx](../../src/views/offer-group.tsx) lines 354–367).
- [x] At most one coral "Best match" dot+label per reply. Hover e1, press scale .98, whole card is one button with an aria-label. **Shipped.** [offer-group.tsx](../../src/views/offer-group.tsx) lines 211–224 and 326–330. Hover and press are in [globals.css](../../src/app/globals.css) lines 808–813. The dot is [globals.css](../../src/app/globals.css) lines 905–909.
- [x] Stagger in at 40ms; keyboard ↑/↓ moves between cards, Enter opens detail. **Shipped.** The stagger is [globals.css](../../src/app/globals.css) lines 587–605. Arrow keys are [offer-group.tsx](../../src/views/offer-group.tsx) lines 224 and 386–396. Enter opens the card because the row is a button. The compare grid does not use those arrow keys.

**Right drawer (More)**
- [ ] 400px, #FFFFFF, e3, slides from the right in 320ms emph; scrim 0.32; Esc / ✕ / scrim click closes; focus trapped and returned to trigger. **Changed.** The width, the white panel, the shadow, the scrim, Escape, the close control, the scrim click, and the focus return landed ([globals.css](../../src/app/globals.css) lines 973–999 and 1481–1483, [sheet.tsx](../../src/design/ui/sheet.tsx) lines 67–86, [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 468–471). The enter slide did not. On main the open state is `animation: none` ([globals.css](../../src/app/globals.css) lines 1002–1004). The exit still runs for 220ms (lines 1006–1007). The 320ms enter frames are still declared (lines 1570–1577) and this drawer does not use them. Open pull request #13 keeps that same open rule.
- [ ] Title "Refine the brief" + one-line description; fields: city, guests (stepper), date, start/end time, budget, food required (switch), currency (segmented pill). **Changed.** The title and the one-line description landed ([more-drawer.tsx](../../src/views/more-drawer.tsx) lines 89–90). City, guests, date, and the two times stay in the thread. The drawer fields are event name, organisation, email, language, rooms, meeting rooms, food, budget, and notes (lines 123–212).
- [ ] Sticky footer: secondary "Reset", primary black "Apply". Applying posts a user-style chip message into the chat ("Updated: 40 guests, with food"). **Changed.** Reset and black Apply landed ([more-drawer.tsx](../../src/views/more-drawer.tsx) lines 101–119). Apply does post a line that starts with "Updated:" (line 358) into a user bubble ([planner-shell.tsx](../../src/views/planner-shell.tsx) lines 473–475). The line names only the fields that changed, so it is not "40 guests, with food". Food reads "food on" or "food off" (lines 349–350).

**Full-screen detail**
- [ ] Opens from a card with a shared-element morph; desktop is an inset 12px sheet r20 e4 over the scrim; mobile is true full-screen r0. **Changed.** The inset, the radius, the shadow, and the full-bleed phone sheet landed ([globals.css](../../src/app/globals.css) lines 1268–1276, 1490–1493, and 1525–1528). Title and price share a spring layout id, stiffness 380 and damping 34 ([offer-detail.tsx](../../src/views/offer-detail.tsx) lines 16 and 118–166). The sheet does not share the card's layout id ([offer-group.tsx](../../src/views/offer-group.tsx) lines 211–214), so the card does not grow into the sheet.
- [ ] Header: round ✕ left, share/copy right; title 22/600, price large tabular; flags; sections: Overview, Includes, Terms/validity, Held by; sticky bottom bar with primary black "File this brief" (draft path) + confirmation. **Changed.** Close, share, copy, the 22/600 title, the price, the flags, and "File this brief" landed ([offer-detail.tsx](../../src/views/offer-detail.tsx) lines 71–105 and 214–227, [globals.css](../../src/app/globals.css) lines 1315–1334). The sections are Overview, the price split, Validity, and Gaps (lines 180–211). Held by stays on the title row. There is no Includes section and no Terms section.
- [x] Close (✕, Esc, back gesture, browser Back via URL `?offer=id`) returns to the same chat scroll position with the card focused. **Shipped.** Opening writes `offer` on the query string; Back removes it and closes the sheet ([planner-shell.tsx](../../src/views/planner-shell.tsx) lines 110–151 and 729–744). Closing focuses the same card (lines 164–170) and keeps the thread scroll (lines 173–189).

**States**
- [x] Empty: centred 28/500 "What are you planning?" + composer + 3 suggestion pills. No logo wall. **Shipped.** [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 37–50 and 301–325. The question and the type are [selectors.ts](../../src/view-models/selectors.ts) lines 167–168 and [globals.css](../../src/app/globals.css) lines 322–329.
- [ ] Loading: a status row ("Searching Proposales…") then 2–3 skeleton cards of the final height. **Changed.** The sentence and three skeletons landed ([planner-shell.tsx](../../src/views/planner-shell.tsx) lines 615–632). Each skeleton is 56px ([globals.css](../../src/app/globals.css) lines 950–956). A card with chips is taller than that.
- [x] Sample-data mode: a quiet neutral chip in the group header, "Sample offers", with a tooltip explaining why. Never coral. **Shipped.** [selectors.ts](../../src/view-models/selectors.ts) lines 126–136 and [offer-group.tsx](../../src/views/offer-group.tsx) lines 80–88.
- [ ] No results: assistant bubble with one sentence + 2 refine pills ("Widen date", "Fewer guests"). **Changed.** The sentence is "No places fit that brief yet." ([offer-group.ts](../../src/contract/offer-group.ts) lines 111–113). The pills are "Widen the date" and "Fewer people" ([planner-shell.tsx](../../src/views/planner-shell.tsx) lines 588–596).
- [x] Error: assistant bubble with a `--danger-text` line + icon + "Try again" secondary button; keep the person's brief in the composer. **Shipped.** [planner-shell.tsx](../../src/views/planner-shell.tsx) lines 103–108 and 598–608. The colour is [globals.css](../../src/app/globals.css) lines 927–932.
- [x] Reduced motion, `:focus-visible` rings, 44px targets, a 390px phone, and desktop frames for the before/after. **Shipped.** Rings are [globals.css](../../src/app/globals.css) lines 100–103. Reduced motion is a 150ms fade (lines 1621–1632) and a short opacity move when motion is reduced ([offer-group.tsx](../../src/views/offer-group.tsx) lines 44 and 214). The phone shots below are 390px wide.

## Before and after

The first six shots are the shell this plan replaced. The after shots are production of main at `346363e`, desktop and phone, at first open, results, detail, and More. They match the screens in the code. Detail had no before shot.

| View | Before | After |
|---|---|---|
| First, desktop | [00-before-desktop-first.png](00-before-desktop-first.png) | [01-after-desktop-first.png](01-after-desktop-first.png) |
| Results, desktop | [00-before-desktop-results.png](00-before-desktop-results.png) | [01-after-desktop-results.png](01-after-desktop-results.png) |
| Detail, desktop | — | [01-after-desktop-detail.png](01-after-desktop-detail.png) |
| More, desktop | [00-before-desktop-more.png](00-before-desktop-more.png) | [01-after-desktop-more.png](01-after-desktop-more.png) |
| First, phone | [00-before-phone-first.png](00-before-phone-first.png) | [01-after-phone-first.png](01-after-phone-first.png) |
| Results, phone | [00-before-phone-results.png](00-before-phone-results.png) | [01-after-phone-results.png](01-after-phone-results.png) |
| Detail, phone | — | [01-after-phone-detail.png](01-after-phone-detail.png) |
| More, phone | [00-before-phone-more.png](00-before-phone-more.png) | [01-after-phone-more.png](01-after-phone-more.png) |

## Verdicts

| # | Item | Verdict | Where |
|---|---|---|---|
| 1 | Composer pill, six lines, floating 16px | Shipped | [globals.css](../../src/app/globals.css) 378–407, [planner-shell.tsx](../../src/views/planner-shell.tsx) 153–161 |
| 2 | Plus, mic, 32px send | Shipped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 414–457 |
| 3 | Enter, Shift+Enter, Cmd/Ctrl+K, placeholder | Shipped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 86–88, 223–227 |
| 4 | Rows inside the assistant bubble | Changed | [planner-shell.tsx](../../src/views/planner-shell.tsx) 345–380 |
| 5 | Held lock chip | Changed | [offer-group.tsx](../../src/views/offer-group.tsx) 354–367 |
| 6 | One Best match, hover, press, aria-label | Shipped | [offer-group.tsx](../../src/views/offer-group.tsx) 211–224 |
| 7 | 40ms stagger and arrow keys | Shipped | [globals.css](../../src/app/globals.css) 587–605, [offer-group.tsx](../../src/views/offer-group.tsx) 386–396 |
| 8 | Drawer enter slide | Changed | [globals.css](../../src/app/globals.css) 1002–1004 |
| 9 | Drawer fields | Changed | [more-drawer.tsx](../../src/views/more-drawer.tsx) 123–212 |
| 10 | "Updated:" chip after Apply | Changed | [more-drawer.tsx](../../src/views/more-drawer.tsx) 327–358 |
| 11 | Card grows into the detail sheet | Changed | [offer-detail.tsx](../../src/views/offer-detail.tsx) 118–166 |
| 12 | Detail sections | Changed | [offer-detail.tsx](../../src/views/offer-detail.tsx) 180–211 |
| 13 | `?offer=` and return to the same card | Shipped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 110–170 |
| 14 | Empty state | Shipped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 301–325 |
| 15 | Skeleton height | Changed | [globals.css](../../src/app/globals.css) 950–956 |
| 16 | Sample offers chip | Shipped | [offer-group.tsx](../../src/views/offer-group.tsx) 80–88 |
| 17 | No-results pills | Changed | [planner-shell.tsx](../../src/views/planner-shell.tsx) 588–596 |
| 18 | Error line and Try again | Shipped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 598–608 |
| 19 | Reduced motion, focus, 44px, 390px frames | Shipped | [globals.css](../../src/app/globals.css) 100–103, 1621–1632 |
| 20 | Colour tokens other than the placeholder | Shipped | [globals.css](../../src/app/globals.css) 4–22 |
| 21 | Placeholder `#8A8A8A` | Changed | [globals.css](../../src/app/globals.css) 15 is `#6e6e6e` |
| 22 | Instrument Sans | Shipped | [layout.tsx](../../src/app/layout.tsx) 6–14 |
| 23 | Type scale other than the drawer title | Shipped | [globals.css](../../src/app/globals.css) 322–329, 845–850, 1315–1320 |
| 24 | Drawer title 17/24 | Changed | [globals.css](../../src/app/globals.css) 1041–1050 is 22/28 |
| 25 | Column 720 and drawer 400 | Shipped | [globals.css](../../src/app/globals.css) 252, 1481–1483 |
| 26 | Bubble radius 16 | Changed | [globals.css](../../src/app/globals.css) 276–281, one corner is 2px |
| 27 | Elevation e0–e4 | Shipped | [globals.css](../../src/app/globals.css) 23–26 |
| 28 | Duration tokens, press, reduced motion | Shipped | [globals.css](../../src/app/globals.css) 27–32, 350–375 |
| 29 | Coral, black, monochrome status | Shipped | [globals.css](../../src/app/globals.css) 163, 905–925 |
| 30 | No photos, no Inter, no `transition: all` | Shipped | [layout.tsx](../../src/app/layout.tsx) 6–14, [globals.css](../../src/app/globals.css) 51–52 |
| 31 | History clock and jump to latest | Shipped | [history-view.tsx](../../src/views/history-view.tsx) 22–36, [planner-shell.tsx](../../src/views/planner-shell.tsx) 387–402 |
| 32 | Tool header Pending / Running / Completed / Error | Dropped | [planner-shell.tsx](../../src/views/planner-shell.tsx) 615–624 |

## References and credits

The reference list lives in the [README](../../README.md) under References. These notes are indexed in [Notes](../README.md).
