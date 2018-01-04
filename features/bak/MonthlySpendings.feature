@After:Spending
Feature: Spendings
  As a user
  I should be able to see spendings only for a specific month

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
    "bookedAt": "[bookedAt]"
    --------------
    When I POST to {CreateSpendingEndpoint}
    Then the status code should be 201

  Where:
    category | title                   | amount | booked | bookedAt
    Pets     | Cat food December       | -15432 | true   | 2014-12-02T00:00:00.000Z
    Pets     | Dog food December       | -8765  | true   | 2014-12-03T00:00:00.000Z
    Salary   | Markus' December Salary | 1234   | true   | 2014-12-04T00:00:00.000Z
    Salary   | Tanja's December Salary | 4321   | true   | 2014-12-04T00:00:00.000Z

  Scenario: Fetch all spendings for the account

    When I POST to {ListSpendingsEndpoint}?dateFrom=2014-12-01T00:00:00.000Z&dateTo=2014-12-31T23:59:59.999Z
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Spending" with 4 of 4 items should be returned
    And "title" of the 1st item should equal "Cat food December"

  Scenario: Fetch summary for the account

    When I POST to {createdCheckingAccountReport}?dateFrom=2014-12-01T00:00:00.000Z&dateTo=2014-12-31T23:59:59.999Z
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Report"
    Then "spendings" should equal -24197
    Then "income" should equal 5555
    Then "balance" should equal -18642
    Then "savings" should equal 0

  Scenario: Change the monthly flag on an account

    When I GET {createdCheckingAccount}
    Then the status code should be 200
    And "monthly" should equal false
    And "$version" should equal 1
    And I store the link to "update-monthly" as "UpdateMonthlyEndpoint"
    Given this is the request body
    --------------
    "value": true
    --------------
    And "1" is the If-Match header
    When I PUT to {UpdateMonthlyEndpoint}
    Then the status code should be 202
    When I GET {createdCheckingAccount}
    Then the status code should be 200
    And "monthly" should equal true
    And "$version" should equal 2
