---
name: Planner bench
description: A cool grey chat column with the venue reply nested inside the thread.
colors:
  canvas: "#F9F9F9"
  rail: "#F4F4F4"
  assistant: "#ECECEC"
  card: "#FAFAFA"
  raised: "#FFFFFF"
  selected: "#DEDEDE"
  chip: "#EEEEEE"
  hairline: "#E2E2E2"
  input-border: "#D4D4D4"
  ink: "#151515"
  secondary: "#666666"
  placeholder: "#6E6E6E"
  action: "#070707"
  action-hover: "#2A2A2A"
  coral: "#FB3D50"
  danger: "#B3261E"
  status: "#444444"
  on-action: "#FFFFFF"
typography:
  display:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.21
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.27
    letterSpacing: "normal"
  card:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.41
    letterSpacing: "normal"
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "normal"
  meta:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: "normal"
  chip:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  bubble: "16px"
  group: "16px"
  row: "12px"
  tile: "10px"
  field: "10px"
  sheet: "20px"
  pill: "999px"
  tail: "2px"
  grown: "24px"
spacing:
  step: "4px"
  bubble-y: "14px"
  bubble-x: "16px"
  row-y: "12px"
  row-x: "14px"
  turn: "24px"
  column: "720px"
  drawer: "400px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.field}"
    height: "44px"
  button-send:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.pill}"
    height: "32px"
    width: "32px"
  button-ghost:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "44px"
  composer:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "8px"
    height: "56px"
  chip:
    backgroundColor: "{colors.chip}"
    textColor: "{colors.status}"
    typography: "{typography.chip}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    height: "20px"
  offer-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.card}"
    rounded: "{rounded.row}"
    padding: "12px 14px"
    height: "56px"
---

# Design system

A chat column. One line in. The reply is a cool grey bubble, and the venues sit in it as lighter cards. The composer stays at the bottom. Add details comes from the right. Detail covers the column and returns to the same place in the thread.

Coral is the mark and one dot on the best valid offer. Actions are black. Status, including Expired, is a neutral chip. Instrument Sans is the only face. Placeholder text is `{colors.placeholder}` (`#6E6E6E`).

| Role | Use |
| --- | --- |
| Action | Send, Apply, File this brief |
| Ink | Primary text, and Compare when it is on |
| Canvas, rail, assistant, card, raised | Page, rail, reply, rows and composer, drawer and sheet |
| Chip, selected, hairline | Chips and the monogram, a pressed segment, edges |
| Danger | Error text with an icon |

| Type | Size | Use |
| --- | --- | --- |
| Display 500 | 28 / 34 | Empty-state question |
| Title 600 | 22 / 28 | Detail name, drawer title |
| Card 600 | 17 / 24 | Venue name |
| Body 400 | 15 / 22 | Reply, composer, prices |
| Meta 500 | 13 / 18 | Held-by, summary, breakdown |
| Chip 500 | 12 / 16 | Chips and the VAT line |

Prices use tabular numbers.

## Layout

A 64px rail plus a 720px column. The composer floats 16px up. Turns are 24px apart, messages 8px. Below 640px the rail hides. New chat and Add details stay in the header. Add details and detail go full width. Compare needs two or three offers and a group at least 640px wide.

| Level | Shadow | Where |
| --- | --- | --- |
| e1 | `0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.04)` | Row hover |
| e2 | `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)` | Composer |
| e3 | `-16px 0 48px rgba(0,0,0,.10)` | Drawer |
| e4 | `0 24px 80px rgba(0,0,0,.18)` | Detail |

Scrim `rgba(10,10,10,.32)`. Motion is transform and opacity: drawer 320ms in and 220ms out, rows 200ms and 8px, stagger 40ms, at most four. Detail springs at stiffness 380 and damping 34. Reduced motion is a 150ms fade. Shadows sit on the composer, the drawer, the detail sheet, or a hovered row. The best compare card uses a 1.5px ink outline that follows Best match and stays off an expired offer.

## Components

| Piece | Rule |
| --- | --- |
| Primary | 44px, 10px radius. Send is a 32px black circle in a 44px hit area. Disabled send face is `{colors.input-border}`. |
| Composer | Pill, max 720px. Placeholder: "Describe the event: place, people, date, time". Header and composer both open Add details |
| Row | 56px. Monogram, name, chips, held-by, one 96px price. Expired price is 60% opacity with a line-through |
| Best match | One coral dot and the words, on the best non-expired offer |
| Compare | Side-by-side, only through the toggle, only when the group qualifies. Lines come from the offer and sum to the total. A remainder is Other |
| Footer | "Prices are totals for the day, excl. VAT" |
| Add details | 400px, white, e3. Five folds, one open. Full width below 640px. Title "Add details" |
| Detail | Desktop inset 12px, radius 20, e4. Phone is full screen. Overview shows the block, who holds it, and the total |

Keep the composer on screen. Best match sits on the best non-expired offer. Lines come from the offer. Leave cream, a serif, photos, and ratings off the page. Coral is not a fill.

Shots and the ledger: [reference pack](notes/design-refs/REFERENCE-PACK.md).
