Feature: Planner critical path
  A full-day brief stays on confirm until the visitor says whether the budget is per person or total, and only then ranks offers.

  Scenario: brief confirms the assumed day, asks the budget basis, and ranks only after confirm
    Given the planner is open with detail and Add details closed
    When the visitor sends "Team offsite in Stockholm for 25 people on 3 Dec 2026, a full day with breakout space and vegetarian lunch. Budget around EUR 300."
    Then the city fact is "Stockholm"
    And the date fact contains "2026"
    And the time fact is "09:00–17:00"
    And the attendees fact is "25 people"
    And the budget fact is "EUR 300"
    And the level 2 heading is the budget-basis fact
    And no budget-basis span is shown yet
    And the facts line contains "09:00" and "17:00"
    And the chat state is "chat:confirm"
    And Yes is absent
    And no offer cards are shown
    When the visitor answers "total" with the basis control
    Then the budget-basis span reads as total
    And Yes is visible
    When the visitor chooses Yes
    Then the chat state is "chat:favorites"
    And no offer cards are shown
    When the visitor chooses Skip
    Then the chat state is "chat:results"
    And one offer card carries the over-budget chip
    And that card shows one EUR amount that must stay visible

  Scenario: ranks Best match on the first open offer and keeps the counts aligned
    Given a confirmed full-day brief on the results
    Then the first offer that is still open shows Best match
    And each expired offer shows Expired, without Best match, and without the best style
    And a No food chip is visible
    And the header count, the reply count, and the number of offer cards are the same

  Scenario: opens an offer in the url, closes with Escape, and keeps the list
    Given a short desktop viewport and a confirmed full-day brief scrolled to the end of the thread
    When the visitor opens the last offer card
    Then the url contains an offer parameter
    And the dialog is visible, including a line that must stay visible
    And the thread scroll position is unchanged
    When the visitor presses Escape
    Then the url has no offer parameter
    And the same venue card is focused
    And the thread scroll position is unchanged

  Scenario: saves a single More field
    Given a full-day brief waiting on confirm, with the budget basis answered as total
    When the visitor opens Add details
    Then the dialog "Add details" is in state "more:open"
    When the visitor sets Event name to "Harbour day" and saves
    Then the dialog closes
    When the visitor opens Add details again
    Then Event name is "Harbour day"
    And Organisation, Email, Budget (EUR), Notes, English, Svenska, Rooms, Meeting rooms, and Food are unchanged

  Scenario: files an English brief from the detail after the email is filled
    Given a wide desktop viewport and the ranked results
    When the visitor opens the first offer and chooses File this brief
    Then the dialog "Add details" is visible
    And Email is focused
    When the visitor sets Email to "planner@northwind.example" and saves
    And the visitor chooses File this brief
    Then the status is "The brief is filed."
    And Filed is disabled
    When the visitor chooses Filed
    Then no turn is sent
    When a phone viewport files that same brief
    Then Filed is disabled and choosing Filed sends no turn

  Scenario: shows Budget (SEK) for a Stockholm brief
    Given a Stockholm brief that names no currency
    When the visitor opens More at 390x844 and at 1280x800
    Then the budget field is labeled "Budget (SEK)"

  Scenario: shows Compare for two or three wide offers only
    Given a wide desktop viewport and the ranked results
    Then Compare is visible and the offer group is at least 640 wide
    When the viewport is a phone
    Then Compare is absent and the offer group is under 640 wide
    When the wide desktop viewport shows two offers
    Then Compare is visible
    When the wide desktop viewport shows one offer
    Then Compare is absent
    When the wide desktop viewport shows five offers
    Then Compare is absent

  Scenario: fits the More drawer on a phone and a desktop
    Given the ranked results
    When the visitor opens Add details at 390 by 844
    Then the drawer body does not scroll sideways
    And Rooms and Meeting rooms are separate rows with 44 pixel controls
    When the visitor opens Add details at 1280 by 800
    Then the drawer body does not scroll sideways
    And every field fits the drawer

  Scenario: shows the chosen language after an English brief
    Given the planner is open with detail and Add details closed
    When the visitor opens Add details before a brief
    Then neither language is pressed, both are enabled, and the hint says what the choice sets
    When an English brief reaches the results and Add details opens
    Then exactly one language control is pressed
    And that choice stays pressed on a phone

  Scenario: shows the updated headcount after More applies
    Given the ranked results on a phone
    When the visitor applies Add details without changes
    Then the status says nothing changed
    When the visitor sets guests to 30 and meeting rooms to 2
    Then a busy state shows while the turn runs
    And the update line is "Updated: 30 guests, 2 meeting rooms"
    And the results header contains the new guest count
    And the same line and count stay visible on a desktop

  Scenario: starts a new chat from the header during a conversation
    Given a phone or a desktop viewport and a full-day brief waiting on confirm
    When the visitor chooses New chat in the header
    Then the empty home asks "What are you planning?"
    And the original brief is gone
    And Yes is absent
    And no offer cards are shown
    And the chat state is "chat:capture"

  Scenario: names the details control the same in the header, composer, and drawer
    Given a phone or a desktop viewport on the empty home
    Then the header and the composer both name the control "Add details"
    And both use the list-plus icon at the same size
    And both tooltips say "Add details"
    When the visitor opens Add details from the header
    Then the drawer title is "Add details"
    When the visitor opens it from the composer
    Then the same drawer is open

  Scenario: places File this brief below the ranked venues
    Given the ranked results
    When the visitor scrolls the thread at 390 by 844
    Then the summary sits above the venue rows
    And the File button top is below the last venue row bottom
    And the File button is fully visible
    And the thread does not scroll sideways
    When the visitor scrolls the thread at 1280 by 800
    Then the summary sits above the venue rows
    And the File button top is below the last venue row bottom
    And the File button is fully visible
    And the thread does not scroll sideways

  Scenario: separates the budget on the confirm step
    Given a phone or a desktop viewport and a full-day brief waiting on confirm
    Then the facts line is "Stockholm, 3 December 2026, 09:00–17:00, 25 people. Assumed 09:00–17:00 for a full day. Budget EUR 300 total."
    And the budget fact is "EUR 300"
    And the budget-basis fact is "total"
