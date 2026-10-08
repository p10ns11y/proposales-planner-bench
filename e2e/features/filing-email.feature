Feature: Filing and email
  Email stays optional while searching. Filing names one missing field, says where to add it, and confirms in the chat.

  Scenario: keeps email optional while searching and requires it when File opens Add details
    Given the ranked results on a phone and on a wide desktop
    When the visitor opens Add details from the header
    Then Email is optional and shows no reply hint
    When the visitor chooses File this brief from the results without an email
    Then Email is required
    And the hint is "Venues reply to this address"
    And Apply with an empty email leaves More open
    When the visitor chooses File this brief from the venue detail without an email
    Then the detail says why Add details opened
    When the visitor saves an email and chooses File this brief
    Then the brief is filed

  Scenario: asks for one missing fileable field at Yes and confirms the filing in chat
    Given a searchable brief that is missing an email, on a phone and on a wide desktop
    When the visitor chooses Yes
    Then the chat shows an email input with Save and Skip
    And Skip still reaches the ranked results
    Given a brief that has an email and no language
    When the visitor chooses Yes
    Then one sentence asks for a language under Add details
    And the brief is not filed
    When the visitor saves a language and files
    Then the chat confirms that the brief is filed

  Scenario: a typed file without an email files nothing and an edit clears the filed brief
    Given the ranked results on a phone and on a wide desktop
    When the visitor types file
    Then the chat shows an email input with Save and Skip
    And the brief stays unfiled
    When the visitor saves an email and chooses File this brief
    Then the brief is filed
    When the visitor changes the headcount to 30 people
    Then the brief is unfiled
    When the visitor chooses File this brief
    Then the brief is filed

  Scenario: shows a transport error in the open detail and keeps File pressable
    Given the venue detail is open for a brief that has an email, on a phone and on a wide desktop
    When the next turn fails on the network
    Then the detail status shows the transport error
    And File this brief can be pressed again
    When the network recovers and the visitor chooses File this brief
    Then the brief is filed
