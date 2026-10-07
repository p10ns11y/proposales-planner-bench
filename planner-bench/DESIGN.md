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

# Design System: Planner bench

## Overview

**Creative North Star: "The nested reply"**

The bench is a chat column. A person writes one line. The reply sits in a cool grey bubble, and the venues sit inside that bubble as lighter cards. The composer stays on the bottom edge. More arrives from the right. A venue's detail covers the column and then returns to the same place in the thread.

The material is cool grey, hairlines, and one sans. Coral is identity, used twice at most: the brand mark, and one dot on the best valid offer.

**Key Characteristics:**

- One composer, floating above the bottom edge.
- Offer cards live inside the assistant reply.
- Cool greys separated by hairlines.
- Instrument Sans for every role, including prices.
- Black for the primary action. Coral is never a fill.

## Colors

Surfaces step from canvas to rail to assistant to card to white. Text is ink, secondary, or placeholder. One black does the primary actions.

### Primary

- **Action** (`{colors.action}`): Send, Apply, and File this brief. Hover is `{colors.action-hover}`.
- **Ink** (`{colors.ink}`): primary text, and the Compare pill when it is on.

### Neutral

- **Canvas** (`{colors.canvas}`): the page.
- **Rail** (`{colors.rail}`): the left rail.
- **Assistant** (`{colors.assistant}`): the reply bubble and the offer group.
- **Card** (`{colors.card}`): offer rows, compare cards, the composer, and fields.
- **Raised** (`{colors.raised}`): the drawer and the detail sheet.
- **Chip** (`{colors.chip}`): chips, the Compare pill when it is off, and the monogram tile.
- **Selected** (`{colors.selected}`): a pressed or selected segment.
- **Hairline** (`{colors.hairline}`): row and card edges.
- **Input border** (`{colors.input-border}`): field borders, and the disabled send face.
- **Secondary** (`{colors.secondary}`): meta text and the price note.
- **Placeholder** (`{colors.placeholder}`): input placeholders. This is darker than the frame's `#8A8A8A` so placeholder text clears WCAG AA on `{colors.card}`.
- **Status** (`{colors.status}`): chip text, including Expired.

### Accent

- **Coral** (`{colors.coral}`): the brand mark and the 6px Best match dot. Never a button, a wash, an error, or body text.

### Danger

- **Danger** (`{colors.danger}`): error text, always with an icon. Never a red fill.

**The Coral Rule.** Coral appears on the brand mark and on at most one Best match dot. Status, including Expired, is a neutral chip: icon plus word.

## Typography

**Display Font:** Instrument Sans
**Body Font:** Instrument Sans
**Label/Mono Font:** Instrument Sans. Prices use tabular numbers at weight 600. There is no second family.

**Character:** A neutral grotesque, set tight on the display and regular on the body. Nothing is set in capitals.

### Hierarchy

- **Display** (500, 28px / 34px, tracking -0.02em): the empty-state question.
- **Title** (600, 22px / 28px): the detail venue name and the drawer title.
- **Card** (600, 17px / 24px): a venue name.
- **Body** (400, 15px / 22px): the reply, the composer, and prices.
- **Meta** (500, 13px / 18px): held-by, the group summary, and the breakdown.
- **Chip** (500, 12px / 16px): chips and the VAT line.

**The One Face Rule.** Instrument Sans is the only face. Placeholder text uses `{colors.placeholder}` (`#6E6E6E`), not `#8A8A8A`.

## Layout

The page is a 64px rail plus a column. The column's content maxes at 720px. The composer floats 16px above the bottom. Messages sit 8px apart inside a turn and 24px between turns.

Below 640px the rail hides, the header sticks, and the More drawer and the detail sheet become full width. Compare is measured on the offer group, not the window: it exists only for two or three offers when that group is at least 640px wide.

**The Sticky Composer Rule.** The input remains in place. Results, More, and detail come and go around it.

## Elevation & Depth

Most surfaces are flat, separated by a hairline.

- **e1**, row hover: `0 1px 2px rgba(0,0,0,.04), 0 2px 8px rgba(0,0,0,.04)`.
- **e2**, composer: `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`.
- **e3**, drawer: `-16px 0 48px rgba(0,0,0,.10)`.
- **e4**, detail: `0 24px 80px rgba(0,0,0,.18)`.

The scrim is `rgba(10,10,10,.32)`.

Motion is transform and opacity. The drawer enters in 320ms and leaves in 220ms. Rows fade and rise 8px over 200ms, staggered 40ms, at most four. Card to detail uses a spring (stiffness 380, damping 34) on the card, the title, and the price. List and compare crossfade in 200ms. Reduced motion is a 150ms opacity change. Never `transition: all`.

**The Hairline Rule.** A shadow is for the composer, the drawer, the detail sheet, or a hovered row. It is not a default card treatment.

## Shapes

Bubbles and the offer group use 16px, with a 2px corner where the bubble meets its speaker. Rows and compare cards use 12px. Tiles and fields use 10px. Chips, the composer, and the header pills are full pills. A multi-line composer uses 24px. The detail sheet uses 20px on desktop and 0 on a phone.

The best compare card adds a 1.5px `{colors.ink}` outline. That outline follows the Best match badge, so it never lands on an expired offer.

## Components

### Buttons

- **Shape:** primary actions are 44px tall with a 10px radius, except Send, which is a 32px black circle inside a 44px hit area.
- **Primary:** `{colors.action}` fill, white text. Apply and File this brief.
- **Ghost:** `{colors.chip}` fill or text-only. Reset, Open, Back to chat, Try again.
- **Hover / Focus:** primary hover is `{colors.action-hover}`. Focus is `0 0 0 2px #F9F9F9, 0 0 0 4px #151515`. Press scales to 0.98.
- **Disabled send:** the 32px face is `{colors.input-border}` and the arrow stays `{colors.ink}`.

### Inputs / Fields

- **Style:** `{colors.card}` fill, 1px `{colors.input-border}`, 15px type, 44px tall, 10px radius.
- **Focus:** the same 2px ink ring.
- **The composer:** a pill, max-width 720px, hairline, e2. Placeholder: "Describe the event: place, people, date, time". The left plus opens More and is named Add details. The header pill is named More.

### The thread

- **Style:** canvas, with the assistant reply on `{colors.assistant}`.
- **A row:** a 56px button. Monogram, name, chips, held-by, and one 96px right-aligned price. An expired price is 60% opacity with a line-through.
- **Best match:** one coral dot and the words Best match, on the best non-expired offer. Never on an expired offer.
- **Compare:** side-by-side cards, only through the Compare toggle, and only when the group qualifies. Breakdown lines come from the offer's own amounts and always sum to the total. A remainder is labelled Other.
- **Footer:** "Prices are totals for the day, excl. VAT".

### Drawer and detail

- **More:** a 400px right drawer, white, e3. Full width below 640px. Title "Refine the brief".
- **Detail:** desktop inset 12px, radius 20, e4. Phone is full screen, radius 0. Overview shows the proposal block, who holds it, and the total. No invented amenities.

## Do's and Don'ts

### Do:

- **Do** keep the composer on screen and the current action reachable.
- **Do** put Best match on the best non-expired offer, and Expired on a neutral chip.
- **Do** render breakdown lines from the offer so they sum to the total.
- **Do** use canvas, rail, assistant, card, ink, and coral as they are tokenised above.

### Don't:

- **Don't** use cream, a serif, or a `<details>` element for More.
- **Don't** hard-code Best match, or put it on an expired offer.
- **Don't** invent photos, ratings, amenities, or prices that do not sum.
- **Don't** use coral as a fill, a wash, or error text.
