@After:Spendings
Feature: Report
  As a user
  I can add and fetch the summary for the account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Fetch summary for the account

    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Report"
    Then "spendings" should equal -18023
    Then "income" should equal 23456
    Then "savings" should equal -326
    Then "balance" should equal 5107

    # Report should be updated
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -18023
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 9428

    # Report should be updated
    Given the request body is empty
    When I POST to {createdCheckingAccountReport}
    Then the status code should be 200
    Then "spendings" should equal -12345
    Then "income" should equal 27777
    Then "savings" should equal -326
    Then "balance" should equal 15106

  Scenario: Fetch summary for the account

    When I POST to {createdCheckingAccountReport}?q=from%3A2014-12-01T00%3A00%3A00.000Z%20to%3A2014-12-31T23%3A59%3A59.999Z
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Report"
    Then "spendings" should equal -24197
    Then "income" should equal 5555
    Then "balance" should equal -18642
    Then "savings" should equal 0
