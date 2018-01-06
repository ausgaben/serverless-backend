@After:Index
Feature: UserAccounts
  This feature sets up the user accounts
  In the real application, this is handled by AWS Cognito

  Scenario Outline: Set up the accounts

    Given the token for this user is stored as "<storeName>Token"
      """
      {
        "email": "<email>",
        "name": "<name>"
      }
      """

    Examples:
      | email                   | name          | storeName |
      | tanja@ausgaben.example  | Tanja Tacker  | tanjas    |
      | markus@ausgaben.example | Markus Tacker | markus    |
