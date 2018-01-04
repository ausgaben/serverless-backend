const {AggregateRepository} = require('@rheactorjs/event-store-dynamodb')
const {PeriodicalModel} = require('../model/periodical')
const {Date: DateType} = require('tcomb')

/**
 * Creates a new periodical repository
 *
 * @param {EventStore} eventStore
 * @param {AggregateRelation} aggregateRelation
 * @constructor
 */
class PeriodicalRepository extends AggregateRepository {
  constructor (eventStore, aggregateRelation) {
    super(PeriodicalModel, eventStore)
    this.relation = aggregateRelation
  }

  /**
   * @param {object} periodical
   */
  add (periodical) {
    const payload = {
      checkingAccount: periodical.checkingAccount,
      author: periodical.author,
      category: periodical.category,
      title: periodical.title,
      amount: periodical.amount,
      estimate: periodical.estimate,
      startsAt: periodical.startsAt ? periodical.startsAt.toISOString() : undefined,
      enabledIn: periodical.enabledIn,
      saving: periodical.saving
    }
    return super.add(payload)
      .then(event => this.relation.addRelatedId('checkingAccount', payload.checkingAccount, event.aggregateId)
        .then(() => event)
      )
  }

  /**
   * Find all periodicals for a month
   *
   * @param {Date} date
   */
  findByMonth (date) {
    DateType(date, ['PeriodicalRepository', 'findByMonth()', 'date:Date'])
    const mask = PeriodicalModel.monthFlags[date.getMonth()]
    return this.findAll()
      .filter(({enabledIn}) => enabledIn & mask)
  }
}

module.exports = {PeriodicalRepository}
