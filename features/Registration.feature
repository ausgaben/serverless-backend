@After:Index
Feature: Registration
  As a user
  I need to register an account
  so that I can log-in

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header

  Scenario Outline: Create the accounts

    Given this is the request body
      """
      {
        "email": "<email>",
        "firstname": "<firstname>",
        "lastname": "<lastname>",
        "password": "<password>"
      }
      """
    When I POST to {registrationEndpoint}
    Then the status code should be 201

    Examples:
      | email                   | firstname | lastname | password                  |
      | tanja@ausgaben.example  | Tanja     | Tacker   | suggest blue mood hill    |
      | markus@ausgaben.example | Markus    | Tacker   | brush entire lucky recall |

  Scenario Outline: Activate the accounts

    Given I have the accountActivationToken for "<email>" in "activationToken"
    And "Bearer {activationToken}" is the Authorization header
    When I POST to {accountActivationEndpoint}
    Then the status code should be 204

    Examples:
      | email                   |
      | tanja@ausgaben.example  |
      | markus@ausgaben.example |

  Scenario Outline: Login to the accounts

    Given this is the request body
      """
      {
        "email": "<email>",
        "password": "<password>"
      }
      """
    When I POST to {loginEndpoint}
    Then the status code should be 201
    And the Content-Type header should equal "application/vnd.ausgaben.v1+json; charset=utf-8"
    And "$context" should equal "https://tools.ietf.org/html/rfc7519"
    And "token" should exist
    And I store "token" as "<storeName>Token"
    And I store the link to "me" as "<storeName>MeEndpoint"

    Examples:
      | email                   | password                  | storeName |
      | tanja@ausgaben.example  | suggest blue mood hill    | tanjas    |
      | markus@ausgaben.example | brush entire lucky recall | markus    |
