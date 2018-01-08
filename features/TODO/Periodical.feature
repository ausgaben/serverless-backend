@After:CheckingAccount
Feature: Periodicals
  As a user
  I can add and retrieve the periodicals for my checking account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Add periodicals and fetch them

    Given this is the request body
    --------------
    "category": "[category]",
    "title": "[title]",
    "amount": [amount],
    "startsAt": "[startsAt]"
    --------------
    When I POST to {CreatePeriodicalEndpoint}
    Then I print the response
    Then the status code should be 202
    # FIXME: Don't use location!
    # And I store the Location header as "createdPeriodical"
    When I GET {createdPeriodical}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Periodical"
    And "$version" should equal 1
    And "category" should equal "[category]"
    And "title" should equal "[title]"
    And "amount" should equal [amount]
    And "startsAt" should equal "[startsAt]"
    And "estimate" should equal false
    And "enabledIn01" should equal true
    And "enabledIn02" should equal true
    And "enabledIn03" should equal true
    And "enabledIn04" should equal true
    And "enabledIn05" should equal true
    And "enabledIn06" should equal true
    And "enabledIn07" should equal true
    And "enabledIn08" should equal true
    And "enabledIn09" should equal true
    And "enabledIn10" should equal true
    And "enabledIn11" should equal true
    And "enabledIn12" should equal true

  Where:

    category | title          | amount | startsAt
    Salary   | Tanja's Salary | 165432 | 2015-01-01T00:00:00.000Z
    Salary   | Markus' Salary | 123456 | 2015-01-02T00:00:00.000Z
    Pets     | Cat food       | -12345 | 2015-01-03T00:00:00.000Z
    Pets     | Dog food       | -23456 | 2015-01-04T00:00:00.000Z

  Scenario: Fetch all periodicals for the account

    When I POST to {ListPeriodicalsEndpoint}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Periodical" with 4 of 4 items should be returned
    And "title" of the 1st item should equal "Tanja's Salary"
