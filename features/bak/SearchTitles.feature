@After:MonthlySpendings
Feature: SearchTitles
  As a user
  I should be able to search the titles used in categories used in a spendings account
  so I can have a typeahead suggestion when creating new spendings

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Search titles used in spendings

    When I POST to {ListTitlesEndpoint}?category=Salary&q=Markus
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Title" with 2 of 2 items should be returned
    And I filter the list by title contains "Markus' December Salary"
    And "title" of the 1st item should equal "Markus' December Salary"
    And "category" of the 1st item should equal "Salary"
