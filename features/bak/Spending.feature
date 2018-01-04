@After:CheckingAccount
Feature: Spendings
  As a user
  I can add and retrieve the spendings for my checking account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Add spendings and fetch them

    Given this is the request body
    --------------
    "category": "[category]",
    "title": "[title]",
    "amount": [amount],
    "booked": [booked],
    "bookedAt": "[bookedAt]",
    "saving": [saving]
    --------------
    When I POST to {CreateSpendingEndpoint}
    Then the status code should be 202
    # FIXME: Don't use location!
    # And I store the Location header as "createdSpending"
    When I GET {createdSpending}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Spending"
    And "$version" should equal 1
    And "category" should equal "[category]"
    And "title" should equal "[title]"
    And "amount" should equal [amount]
    And "booked" should equal [booked]
    And "bookedAt" should equal "[bookedAt]"
    And "saving" should equal [saving]

  Where:
    category | title          | amount | booked | bookedAt                 | saving
    Pets     | Cat food       | -12345 | true   | 2015-01-02T00:00:00.000Z | false
    Pets     | Dog food       | -5678  | true   | 2015-01-03T00:00:00.000Z | false
    Salary   | Markus' Salary | 23456  | true   | 2015-01-04T00:00:00.000Z | false
    Salary   | Tanja's Salary | 4321   | false  | 2015-01-04T00:00:00.000Z | false
    Savings  | Pension Fund   | -326   | true   | 2015-01-04T00:00:00.000Z | true

  Scenario: Fetch all spendings for the account

    When I POST to {ListSpendingsEndpoint}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Spending" with 5 of 5 items should be returned
    And "title" of the 1st item should equal "Cat food"
    And I store "$id" of the 2nd item as "dogFoodSpending"
    And I store "$id" of the 4th item as "tanjasSalarySpending"

  Scenario: Fetch summary for the account

    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Report"
    Then "spendings" should equal -18023
    Then "income" should equal 23456
    Then "savings" should equal -326
    Then "balance" should equal 5107

  Scenario: Update spending

    Given this is the request body
    --------------
    "title": "Tanja's Salary for April 2015",
    "booked": true
    --------------
    And "1" is the If-Match header
    When I PUT to {tanjasSalarySpending}
    Then the status code should be 202
    When I GET {tanjasSalarySpending}
    Then "$version" should equal 2
    And "title" should equal "Tanja's Salary for April 2015"
    And "booked" should equal true
    And "amount" should equal 4321
    # Report should be updated
    Given the request body is empty
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -18023
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 9428

  Scenario: Delete spending

    Given the request body is empty
    And "1" is the If-Match header
    When I DELETE {dogFoodSpending}
    Then the status code should be 202
    # Spending should be deleted
    When I GET {dogFoodSpending}
    Then the status code should be 404
    # Report should be updated
    Given the request body is empty
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -12345
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 15106
