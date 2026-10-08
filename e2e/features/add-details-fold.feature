Feature: Add details prefill and folds
  Known brief fields are filled when Add details opens. The fields fold by category, and one section stays open.

  Scenario: prefills known brief fields and keeps one section open
    Given a brief that already names the contact, the event, the people, the budget, and the preferences
    When the visitor opens Add details at 390 by 844
    Then one section is open
    And that section shows the prefilled organisation and email
    When the visitor opens Event and dates
    Then Contact closes and Event and dates is the only open section
    And the event name, city, dates, and times are filled from the brief
    When the visitor opens People and rooms
    Then the guests, rooms, meeting rooms, and food are filled from the brief
    When the visitor opens Budget
    Then the amount, basis, and currency are filled from the brief
    When the visitor opens Preferences
    Then the language and notes are filled from the brief
    And the drawer does not scroll sideways
    When the visitor saves without changes
    Then the status says nothing changed
    When the visitor opens Add details at 1280 by 800
    Then one section is open
    And that section shows the prefilled organisation and email
    When the visitor opens Event and dates
    Then Contact closes and Event and dates is the only open section
    And the drawer does not scroll sideways
