Feature: Planner critical path
  A full-day brief stays on confirm until the visitor says whether the budget is per person or total, and only then ranks offers.

  Scenario: brief confirms the assumed day, asks the budget basis, and ranks only after confirm
    Given the planner is open with detail and More closed
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
    When the visitor opens More
    Then the dialog "Refine the brief" is in state "more:open"
    When the visitor sets Event name to "Harbour day" and saves
    Then the dialog closes
    When the visitor opens More again
    Then Event name is "Harbour day"
    And Organisation, Email, Budget (EUR), Notes, English, Svenska, Rooms, Meeting rooms, and Food are unchanged

  Scenario: files an English brief from the detail after the email is filled
    Given a wide desktop viewport and the ranked results
    When the visitor opens the first offer and chooses File this brief
    Then the dialog "Refine the brief" is visible
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
