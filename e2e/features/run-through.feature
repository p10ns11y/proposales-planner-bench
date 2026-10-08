Feature: Run-through filing
  One chat keeps one brief. A single missing fileable input is answered in the chat.

  Scenario: a typed file with no email shows an inline email input
    Given the ranked results on a phone and on a wide desktop
    When the visitor types file
    Then the chat shows an email input with Save and Skip
    And File this brief stays enabled
    And the brief stays unfiled

  Scenario: a single-day brief detail shows no end-date hint
    Given a single-day brief with start and end times on a phone and on a wide desktop
    When the visitor opens the first venue detail
    Then the detail does not ask for an end date
    And File this brief is enabled

  Scenario: history names the current brief once per chat
    Given the ranked results on a phone and on a wide desktop
    When the visitor files the brief twice in the same chat
    Then history shows one row named from the brief
    And the row uses local time and a venue count
    And the row says it was filed twice
