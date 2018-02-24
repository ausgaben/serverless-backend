@After:Monthly Spendings
Feature: Currency
  As a user
  I should be able to set the currency of an account

  Background: Client defaults

    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Accept header
    Given "application/vnd.ausgaben.v1+json; charset=utf-8" is the Content-Type header
    Given "Bearer {tanjasToken}" is the Authorization header

  Scenario: Change the currency for an account

    When I GET {createdCheckingAccount}
    Then the status code should be 200
    And "currency" should equal "€"
    And "$version" should equal 2
    And I store the link to "update-currency" as "UpdateCurrencyEndpoint"
    And "2" is the If-Match header
    When I PUT to {UpdateCurrencyEndpoint}
    """
    {"value": "USD"}
    """
    Then the status code should be 202
    When I GET {createdCheckingAccount}
    Then the status code should be 200
    And "currency" should equal "USD"
    And "$version" should equal 3
