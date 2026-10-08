Feature: Composer microphone
  The composer microphone explains when speech cannot start, and returns to Speak after a recognition error. Typing still works. No real audio is used.

  Scenario: explains that speech input is unavailable
    Given a phone viewport of 390 by 844
    And a speech API that throws as soon as start is called
    When the planner is open
    Then Speak is enabled
    When the visitor chooses Speak
    Then Speak is absent
    And the status is "Speech input could not start in this browser."
    And that status sits inside the phone viewport
    Given a desktop viewport of 1280 by 800
    And a speech API that throws as soon as start is called
    When the planner is open
    Then Speak is enabled
    When the visitor chooses Speak
    Then Speak is absent
    And the status is "Speech input could not start in this browser."
    And that status sits inside the desktop viewport

  Scenario: returns the microphone after a recognition error
    Given a phone viewport of 390 by 844
    And a speech API that reports permission was denied
    When the planner is open
    Then Speak is enabled
    When the visitor chooses Speak
    Then Speak is enabled
    And the status is "Microphone permission was denied in this browser. Press Speak to try again."
    When the visitor chooses Speak
    Then Listening is shown
    Given a desktop viewport of 1280 by 800
    And a speech API that reports permission was denied
    When the planner is open
    Then Speak is enabled
    When the visitor chooses Speak
    Then Speak is enabled
    And the status is "Microphone permission was denied in this browser. Press Speak to try again."
    When the visitor chooses Speak
    Then Listening is shown

  Scenario: keeps a gap between the speech status and the composer
    Given a phone viewport of 390 by 844
    And a speech API that reports permission was denied
    When the planner is open
    Then the composer is in place
    When the visitor chooses Speak
    Then the status is two lines
    And at least 8 pixels separate that status from the composer
    And the composer has not moved
    Given a desktop viewport of 1280 by 800
    And a speech API that reports permission was denied
    When the planner is open
    Then the composer is in place
    When the visitor chooses Speak
    Then at least 8 pixels separate that status from the composer
    And the composer has not moved
