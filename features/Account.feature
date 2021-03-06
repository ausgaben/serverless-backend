@After:UserAccounts
Feature: Account
  As a user
  I want to fetch my account
  so that I can fetch my checking accounts

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header

  Scenario Outline: Fetch my account

    Given "Bearer {<storeName>Token}" is the Authorization header
    When I POST /me
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://github.com/RHeactorJS/models#User"
    And "email" should equal "<email>"
    And "name" should equal "<name>"
    And "password" should not exist
    And I store the link to the list "https://github.com/ausgaben/ausgaben-rheactor/wiki/JsonLD#CheckingAccount" as "<storeName>CheckingAccounts"

    Examples:
      | storeName | email                   | name          |
      | tanjas    | tanja@ausgaben.example  | Tanja Tacker  |
      | markus    | markus@ausgaben.example | Markus Tacker |
