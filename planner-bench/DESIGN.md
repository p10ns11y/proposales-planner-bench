---
name: Planner bench
description: A paper-quiet web bench with one sticky line at the bottom.
colors:
  ink: "#1c1915"
  paper: "#f4f1ea"
  card: "#fffdf8"
  clay: "#5e584e"
  rule: "#d8d0c4"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  control: "0.375rem"
spacing:
  control-x: "12px"
  control-y: "8px"
  composer-pad: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "48px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "48px"
  input-line:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "48px"
---

# Design System: Planner bench

## Overview

**Creative North Star: "The sticky line"**

Taken from the brief that the bench should feel like a regular chat, close to Grok: one input, fixed, and the work appearing behind it. The north star is that line. Everything else is paper, type, and the few elements the thread is allowed to show.

The material already in the app is warm paper and old-style serif. Density stays low. The page is one column. The composer sits on the bottom edge and does not move. The thread above it is the only region that moves. A result's detail leaves the thread and opens as an overlay or a modal.

The split pane and the full brief form in the current branch are the previous pass. They are not the layout to copy.

**Key Characteristics:**

- One composer, stuck to the bottom.
- Paper and ink, no second accent.
- Serif throughout, including the input.
- Elements appear in the thread only for the current step.
- Flat surfaces. A border is the edge.

## Colors

The palette is ink on warm paper. One dark color does the work of both text and the primary control.

### Primary

- **Ink** (`{colors.ink}`): text, the primary button, selection, and the focus ring.

### Neutral

- **Paper** (`{colors.paper}`): the page.
- **Card** (`{colors.card}`): the composer, inputs, and overlay surfaces.
- **Clay** (`{colors.clay}`): secondary text and placeholders.
- **Rule** (`{colors.rule}`): borders and the line between thread and composer.

**The One Ink Rule.** Ink is the only strong color. Status is said in words, not in a new hue.

## Typography

**Display Font:** Iowan Old Style (with Palatino Linotype, Palatino, Book Antiqua, Georgia)
**Body Font:** the same stack
**Label/Mono Font:** the same stack. There is no mono role.

**Character:** One serif family, set like a letter. The composer uses the same face at body size so the input does not feel like a form widget.

### Hierarchy

- **Display** (regular, 1.5rem, line-height 1.25): the current question, when the thread needs a heading.
- **Body** (regular, 1rem, line-height 1.5): the brief sentence, the rows, the composer. Inputs stay at 1rem so a phone does not zoom them.
- **Label** (regular, 0.875rem, line-height 1.4): secondary facts on a row, such as who holds the venue.

**The Same Face Rule.** Do not introduce a sans for UI chrome.

## Layout

The page is one column inside the viewport. The composer is fixed to the bottom and stays fully on screen, including its action. The thread occupies the space above it.

On a phone the same stack holds. The composer does not collapse into the thread, and the current action stays visible.

The earlier 38/62 column split is recorded in the CSS as the previous pass. New work does not extend that split.

**The Sticky Line Rule.** The input remains in place. If something must move, it is the thread.

## Elevation & Depth

Surfaces are flat. Depth is a change of tone from paper to card, plus a 1px rule. An overlay sits on a tint of ink over the page and uses the card surface. It does not use a drop shadow.

**The Flat Paper Rule.** Do not add a shadow to make a control look clickable. The fill and the border do that.

## Shapes

Controls use a small radius (0.375rem). Corners are slightly soft, never pills, except where a control is already a short button. Borders are the rule color, 1px.

## Components

### Buttons

- **Shape:** small radius (0.375rem), at least 48px tall.
- **Primary:** ink fill, paper text. The step's main action.
- **Ghost:** card fill, ink text, rule border. History, skip, and dismiss.
- **Hover / Focus:** focus is a 2px ink outline, 2px outside the control. Hover does not add a shadow.

### Inputs / Fields

- **Style:** card fill, 1px rule, body type, 1rem.
- **Focus:** the same 2px ink outline.
- **The composer:** the sticky input at the bottom. It is the signature control. Placeholder text is clay, and it shows a real example of a request.

### The thread

- **Style:** paper, no card around the whole thread.
- **A row:** venue name and total on one line, a quiet second line only when the row has something to add. The row itself opens the overlay.
- **An element for a step:** one block in the thread. It does not stack every brief field.

### Overlay

- **Corner Style:** the same small radius as controls.
- **Background:** card, on a tint of ink.
- **Shadow Strategy:** none.
- **Border:** 1px rule.
- **Internal Padding:** comfortable, from the page padding, not a new scale.

## Do's and Don'ts

### Do:

- **Do** keep the composer on screen and the current action reachable.
- **Do** use ink, paper, card, clay, and rule as they are tokenised above.
- **Do** open detail in an overlay or a modal.

### Don't:

- **Don't** rebuild the brief as a field grid.
- **Don't** put Company before the input.
- **Don't** add a second accent, a gradient, or a shadow to create hierarchy.
