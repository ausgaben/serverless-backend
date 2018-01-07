const {AggregateRepository} = require('@rheactorjs/event-store-dynamodb')
const {SpendingModel} = require('../model/spending')

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
   * @param {SpendingModel} spending
   */
  add (spending) {
    const payload = {
      checkingAccount: spending.checkingAccount,
      author: spending.author,
      category: spending.category,
      title: spending.title,
      amount: spending.amount,
      booked: spending.booked,
      saving: spending.saving
    }
    if (spending.bookedAt) {
      payload.bookedAt = spending.bookedAt
    }
    return super
      .add(payload)
      .then(event => this.relation.addRelatedId('checkingAccount', payload.checkingAccount, event.aggregateId)
        .then(() => event))
  }

  /**
   * Deletes a Spending
   *
   * @param {SpendingModel} spending
   * @param {UserModel} author
   * @return {Promise.<SpendingDeletedEvent>}
   */
  remove (spending, author) {
    return super.remove(spending.meta.id, spending.meta.version, {author: author.meta.id})
      .then(event => this.relation.removeRelatedId('checkingAccount', spending.checkingAccount, spending.meta.id)
        .then(() => event)
      )
  }

  findIdsByCheckingAccountId (checkingAccountId) {
    return this.relation.findByRelatedId('checkingAccount', checkingAccountId)
  }
}

module.exports = {SpendingRepository}
