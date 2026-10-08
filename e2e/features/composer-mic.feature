Feature: Composer microphone
  The composer microphone explains when speech cannot start. Typing still works. No real audio is used.

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
