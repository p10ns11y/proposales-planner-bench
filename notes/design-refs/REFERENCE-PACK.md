# Proposales planner redesign: reference pack

This pack locked the visual direction before code: a reference lock, the tokens, a decision ledger, and an anti-slop check. The verdicts are the app on main at `346363e`.

**19 shipped, 12 changed, 1 dropped, out of 32.** The [ledger](#verdicts) is the full list. The [before and after](#before-and-after) pairs the shots.

---

## 1. Reference lock

Primary reference: the Grok Bot desktop chat column.

| Keep | |
| --- | --- |
| Greys | Canvas `#F9F9F9`, rail `#F4F4F4`, assistant `#ECECEC`. Hairline `#E2E2E2` |
| Send | Black `#070707` circle |
| Coral `#FB3D50` | Brand mark and one Best match. Text, if any, uses `#D92D3F`. Coral is 3.4:1, so it is not body text |
| Borrow | A one-line group header, and a right sheet with a sticky primary action |
| Media | No photos. Optional monogram tile, `#EEEEEE`, 40px |
| Reject | Cream, serif, `<details>` for Add details, boxed Send/Speak/History, indigo, emoji, stripes, a shadow on every card, Inter, `transition: all` |

Shipped: greys, hairline, black send, coral on the mark and one Best match, and those rejects. Changed: ranked rows sit under the reply, in their own grey block. See the [verdicts](#verdicts).

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

Composer icons, a jump-to-latest control, a letter tile on a `#FAFAFA` row, a right sheet, and an empty state of one question plus the composer. Shipped: those icons, the history clock, and the sheet. Dropped: a four-state tool header. The search step is one sentence. See the [verdicts](#verdicts).

---

## 4. Decision ledger
| Decision | Source | Role rule | Why |
|---|---|---|---|
| Cool grey canvas #F9F9F9 | Grok Bot chat column | canvas only | matches that column and drops the cream editorial canvas |
| Offer rows nested inside the assistant bubble | Grok Bot nested answer card | #FAFAFA card on #ECECEC bubble | the ranked rows belong inside the assistant reply |
| Group header + status | Tool / artifact header | header row only | gives the reply a scannable summary line and a place for Compare |
| Right drawer for Add details | Sheet anatomy | primary action black | Add details expands from the right |
| Full-screen detail with morph | Dialog primitive | Esc/✕ return to the same scroll spot | a result opens full screen and closes back to the chat |
| Black send, coral only for brand + Best match | Grok Bot chat column | coral never a fill | keeps the one accent meaningful |
| Instrument Sans | craft (typography), not Inter | one family | neutral grotesque with tnum for prices |

**Shipped** for the canvas, the nested-card colours, the black send, and Instrument Sans. **Changed:** Add details is a right drawer, and its fields are the extras below, not the city and guest controls. The detail sheet opens over a scrim; the shared move is the title and the price.

---

## 5. Anti-patterns

Cream, serif, `<details>` for Add details, boxed Send/Speak/History, coral as a fill, emoji, stripes, a shadow on every card, `transition: all`, Expired by colour alone, and fake photos. Fixtures stay Harbour House, Ridge Hall, and Canal Loft. Status uses an icon, a word, and a struck price.

---

## Checklist

The 32 items, with file and line, are the [verdicts](#verdicts). Shots of the same views are [below](#before-and-after).

## Before and after

The first six shots are the shell this plan replaced. The after shots are production of main at `346363e`, desktop and phone, at first open, results, detail, and Add details. They match the screens in the code. Detail had no before shot.

| View | Before | After |
|---|---|---|
| First, desktop | [00-before-desktop-first.png](00-before-desktop-first.png) | [01-after-desktop-first.png](01-after-desktop-first.png) |
| Results, desktop | [00-before-desktop-results.png](00-before-desktop-results.png) | [01-after-desktop-results.png](01-after-desktop-results.png) |
| Detail, desktop | — | [01-after-desktop-detail.png](01-after-desktop-detail.png) |
| Add details, desktop | [00-before-desktop-more.png](00-before-desktop-more.png) | [01-after-desktop-more.png](01-after-desktop-more.png) |
| First, phone | [00-before-phone-first.png](00-before-phone-first.png) | [01-after-phone-first.png](01-after-phone-first.png) |
| Results, phone | [00-before-phone-results.png](00-before-phone-results.png) | [01-after-phone-results.png](01-after-phone-results.png) |
| Detail, phone | — | [01-after-phone-detail.png](01-after-phone-detail.png) |
| Add details, phone | [00-before-phone-more.png](00-before-phone-more.png) | [01-after-phone-more.png](01-after-phone-more.png) |

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

The reference list lives in the [README](../../README.md) under References. The reading path starts at the [map](../../README.md#map).
