@After:CheckingAccount
Feature: Spendings
  As a user
  I can add and retrieve the spendings for my checking account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario Outline: Add spendings and fetch them

    When I POST to {CreateSpendingEndpoint}
    """
    {
    "category": "<category>",
    "title": "<title>",
    "amount": <amount>,
    "booked": <booked>,
    "bookedAt": "<bookedAt>",
    "saving": <saving>
    }
    """
    Then the status code should be 202
    When I POST to {ListSpendingsEndpoint}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Spending" with <numItems> of <numItems> items should be returned
    And "$context" of the item matching title:"<title>" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Spending"
    And "$version" of the item matching title:"<title>" should equal 1
    And "category" of the item matching title:"<title>" should equal "<category>"
    And "amount" of the item matching title:"<title>" should equal <amount>
    And "booked" of the item matching title:"<title>" should equal <booked>
    And "bookedAt" of the item matching title:"<title>" should equal "<bookedAt>"
    And "saving" of the item matching title:"<title>" should equal <saving>
    And I store "$lookup($$, '$id').url" of the item matching title:"<title>" as "<store>Spending"

    Examples:
      | category | title          | amount | booked | bookedAt                 | saving | numItems | store        |
      | Pets     | Cat food       | -12345 | true   | 2015-01-02T00:00:00.000Z | false  | 1        | catFood      |
      | Pets     | Dog food       | -5678  | true   | 2015-01-03T00:00:00.000Z | false  | 2        | dogFood      |
      | Salary   | Markus' Salary | 23456  | true   | 2015-01-04T00:00:00.000Z | false  | 3        | markusSalary |
      | Salary   | Tanja's Salary | 4321   | false  | 2015-01-04T00:00:00.000Z | false  | 4        | tanjasSalary |
      | Savings  | Pension Fund   | -326   | true   | 2015-01-04T00:00:00.000Z | true   | 5        | pensionFund  |

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

    Given "1" is the If-Match header
    When I PUT to {tanjasSalarySpending}
    """
    {
      "title": "Tanja's Salary for April 2015",
      "booked": true
    }
    """
    Then the status code should be 202
    When I GET {tanjasSalarySpending}
    Then "$version" should equal 2
    And "title" should equal "Tanja's Salary for April 2015"
    And "booked" should equal true
    And "amount" should equal 4321
    # Report should be updated
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -18023
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 9428

  Scenario: Delete spending

    And "1" is the If-Match header
    When I DELETE {dogFoodSpending}
    Then the status code should be 202
    # Spending should be deleted
    When I GET {dogFoodSpending}
    Then the status code should be 404
    # Report should be updated
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -12345
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 15106
