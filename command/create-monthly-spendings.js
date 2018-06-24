'use strict'

/**
 * @param {PeriodicalRepository} periodicalsRepository
 * @param {SpendingRepository} spendingsRepository
 * @constructor
 */
class CreateMonthlySpendingsCommand {
  constructor (periodicalsRepository, spendingsRepository) {
    this.periodicalsRepository = periodicalsRepository
    this.spendingsRepository = spendingsRepository
  }

  /**
   * @param {Number} month
   * @returns {Promise.<Array.<ModelEvent>>}
   */
  execute (month) {
    // Find the periodicals for the given month
    return this
      .periodicalsRepository
      .findByMonth(month)
      .map(periodical => this.spendingsRepository.add({
        checkingAccount: periodical.checkingAccount,
        category: periodical.category,
        title: periodical.title,
        amount: periodical.amount,
        booked: false,
        bookedAt: month,
        saving: periodical.saving
      }))
  }
}

module.exports = {CreateMonthlySpendingsCommand}
