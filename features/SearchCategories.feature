@After:Monthly Spendings
Feature: SearchCategories
  As a user
  I should be able to search the categories used in a spendings account
  so I can have a typeahead suggestion when creating new spendings

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Search categories used in spendings

    When I POST to {ListTitlesEndpoint}?q=in%3Acategory%20P
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And a list of "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#Title" with 1 of 1 items should be returned
    And "title" of the 1st item should equal "Pets"
