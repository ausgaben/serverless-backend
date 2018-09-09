const { AggregateRepository, AggregateMeta } = require('@rheactorjs/event-store-dynamodb')
const { CheckingAccountModel } = require('../model/checking-account')
const { NonEmptyString } = require('@rheactorjs/event-store-dynamodb')
const { v4 } = require('uuid')

/**
 * Creates a new checkingAccount repository
 *
 * @param {EventStore} eventStore
 * @constructor
 */
class CheckingAccountRepository extends AggregateRepository {
  constructor (eventStore, aggregateRelation, aggregateIndex) {
    super(CheckingAccountModel, eventStore)
    this.relation = aggregateRelation
    this.sortIndex = aggregateIndex
  }

  /**
   * @param {object} payload
   * @return {Promise.<CheckingAccountCreatedEvent>}
   */
  add (payload) {
    return this.eventStore
      .persist(CheckingAccountModel.create(payload, new AggregateMeta(v4(), 1)))
      .then(event => Promise.all(payload.users.map(user => this.relation.addRelatedId('user', user, event.aggregateId)))
        .then(() => event)
      )
  }

  /**
   * Updates a CheckingAccount
   *
   * @param {CheckingAccountModel} checkingAccount
   * @param {object} payload
   * @return {Promise.<CheckingAccountUpdatedEvent>}
   */
  update (checkingAccount, payload) {
    return this.eventStore
      .persist(checkingAccount.update(payload))
  }

  findIdsByUser (user) {
    return this.relation.findByRelatedId('user', NonEmptyString(user, ['CheckingAccountRepository', 'findIdsByUser()', 'user:String']))
  }
}

module.exports = { CheckingAccountRepository }
