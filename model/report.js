'use strict'

function ReportModel (checkingAccount) {
  this.checkingAccount = checkingAccount
  this.balance = 0
  this.income = 0
  this.spendings = 0
  this.savings = 0
}

module.exports = {ReportModel}
