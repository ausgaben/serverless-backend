const { AggregateRepository, AggregateMeta } = require('@rheactorjs/event-store-dynamodb')
const { PeriodicalModel } = require('../model/periodical')
const { Date: DateType } = require('tcomb')
const { v4 } = require('uuid')

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
   * @param {object} payload
   */
  add (payload) {
    return this.eventStore
      .persist(PeriodicalModel.create(payload, new AggregateMeta(v4(), 1)))
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
      .filter(({ enabledIn }) => enabledIn & mask)
  }

  findIdsByCheckingAccountId (checkingAccountId) {
    return this.relation.findByRelatedId('checkingAccount', checkingAccountId)
  }
}

module.exports = { PeriodicalRepository }
