const { AggregateRepository, AggregateMeta } = require('@rheactorjs/event-store-dynamodb')
const { SpendingModel } = require('../model/spending')
const { v4 } = require('uuid')

/**
 * Creates a new spending repository
 *
 * @param {EventStore} eventStore
 * @param {AggregateRelation} aggregateRelation
 * @param {AggregateSortIndex} aggregateIndex
 * @constructor
 */
class SpendingRepository extends AggregateRepository {
  constructor (eventStore, aggregateRelation, aggregateSortIndex) {
    super(SpendingModel, eventStore)
    this.relation = aggregateRelation
    this.sortIndex = aggregateSortIndex
  }

  /**
   * @param {object} payload
   * @return {Promise.<SpendingCreatedEvent>}
   */
  add (payload) {
    return this.eventStore
      .persist(SpendingModel.create(payload, new AggregateMeta(v4(), 1)))
      .then(event => Promise
        .all([
          this.relation.addRelatedId('checkingAccount', payload.checkingAccount, event.aggregateId),
          updateBookedIndex(this.sortIndex)(payload.checkingAccount, event.aggregateId, payload.bookedAt)
        ])
        .then(() => event)
      )
  }

  /**
   * Updates a Spending
   *
   * @param {SpendingModel} spending
   * @param {object} payload
   * @return {Promise.<SpendingUpdatedEvent>}
   */
  update (spending, payload) {
    return this.eventStore
      .persist(spending.update(payload))
      .then(event => updateBookedIndex(this.sortIndex)(spending.checkingAccount, event.aggregateId, payload.bookedAt)
        .then(() => event)
      )
  }

  /**
   * Deletes a Spending
   *
   * @param {SpendingModel} spending
   * @return {Promise.<SpendingDeletedEvent>}
   */
  delete (spending) {
    return this.eventStore.persist(spending.delete())
      .then(event => Promise
        .all([
          this.relation.removeRelatedId('checkingAccount', spending.checkingAccount, spending.meta.id),
          updateBookedIndex(this.sortIndex)(spending.checkingAccount, event.aggregateId)
        ])
        .then(() => event)
      )
  }

  findIdsByCheckingAccountId (checkingAccountId, { from, to } = {}) {
    return this.relation.findByRelatedId('checkingAccount', checkingAccountId)
      .then(ids => {
        if (from) {
          return this.sortIndex.find(`checkingAccount:${checkingAccountId}:bookedAt`, from, to)
            .then(filteredIds => ids.filter(id => filteredIds.indexOf(id) >= 0).sort((id1, id2) => filteredIds.indexOf(id1) - filteredIds.indexOf(id2)))
        }
        return ids
      })
  }
}

const updateBookedIndex = index => (checkingAccountId, aggregateId, bookedAt) => bookedAt
  ? index.add(`checkingAccount:${checkingAccountId}:bookedAt`, aggregateId, bookedAt.toISOString())
  : index.remove(`checkingAccount:${checkingAccountId}:bookedAt`, aggregateId)

module.exports = { SpendingRepository }
