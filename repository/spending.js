const {AggregateRepository, AggregateMeta} = require('@rheactorjs/event-store-dynamodb')
const {SpendingModel} = require('../model/spending')
const {v4} = require('uuid')

/**
 * Creates a new spending repository
 *
 * @param {EventStore} eventStore
 * @param {AggregateRelation} aggregateRelation
 * @constructor
 */
class SpendingRepository extends AggregateRepository {
  constructor (eventStore, aggregateRelation) {
    super(SpendingModel, eventStore)
    this.relation = aggregateRelation
  }

  /**
   * @param {object} payload
   */
  add (payload) {
    return super
      .persistEvent(SpendingModel.create(payload, new AggregateMeta(v4(), 1)))
      .then(event => this.relation.addRelatedId('checkingAccount', payload.checkingAccount, event.aggregateId)
        .then(() => event))
  }

  /**
   * Deletes a Spending
   *
   * @param {SpendingModel} spending
   * @return {Promise.<SpendingDeletedEvent>}
   */
  remove (spending) {
    return super.remove(spending.meta.id, spending.meta.version)
      .then(event => this.relation.removeRelatedId('checkingAccount', spending.checkingAccount, spending.meta.id)
        .then(() => event)
      )
  }

  findIdsByCheckingAccountId (checkingAccountId) {
    return this.relation.findByRelatedId('checkingAccount', checkingAccountId)
  }
}

module.exports = {SpendingRepository}
