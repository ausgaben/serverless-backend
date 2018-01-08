@After:CheckingAccount
Feature: Periodicals
  As a user
  I can add and retrieve the periodicals for my checking account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario Outline: Add periodicals and fetch them

    When I POST to {CreatePeriodicalEndpoint}
    """
    {
    "category": "<category>",
    "title": "<title>",
    "amount": <amount>,
    "startsAt": "<startsAt>"
    }
    """
    Then the status code should be 202
    When I POST to {ListPeriodicalsEndpoint}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Periodical" with <numItems> of <numItems> items should be returned
    And "$version" of the item matching title:"<title>" should equal 1
    And "category" of the item matching title:"<title>" should equal "<category>"
    And "amount" of the item matching title:"<title>" should equal <amount>
    And "startsAt" of the item matching title:"<title>" should equal "<startsAt>"
    And "estimate" of the item matching title:"<title>" should equal false
    And "enabledIn01" of the item matching title:"<title>" should equal true
    And "enabledIn02" of the item matching title:"<title>" should equal true
    And "enabledIn03" of the item matching title:"<title>" should equal true
    And "enabledIn04" of the item matching title:"<title>" should equal true
    And "enabledIn05" of the item matching title:"<title>" should equal true
    And "enabledIn06" of the item matching title:"<title>" should equal true
    And "enabledIn07" of the item matching title:"<title>" should equal true
    And "enabledIn08" of the item matching title:"<title>" should equal true
    And "enabledIn09" of the item matching title:"<title>" should equal true
    And "enabledIn10" of the item matching title:"<title>" should equal true
    And "enabledIn11" of the item matching title:"<title>" should equal true
    And "enabledIn12" of the item matching title:"<title>" should equal true

    Examples:

      | category | title          | amount | startsAt                 | numItems |
      | Salary   | Tanja's Salary | 165432 | 2015-01-01T00:00:00.000Z | 1        |
      | Salary   | Markus' Salary | 123456 | 2015-01-02T00:00:00.000Z | 2        |
      | Pets     | Cat food       | -12345 | 2015-01-03T00:00:00.000Z | 3        |
      | Pets     | Dog food       | -23456 | 2015-01-04T00:00:00.000Z | 4        |
