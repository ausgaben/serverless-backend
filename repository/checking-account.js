const {AggregateRepository, AggregateMeta} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountModel} = require('../model/checking-account')
const {NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {v4} = require('uuid')

/**
 * Creates a new checkingAccount repository
 *
 * @param {EventStore} eventStore
 * @constructor
 */
class CheckingAccountRepository extends AggregateRepository {
  constructor (eventStore, aggregateRelation) {
    super(CheckingAccountModel, eventStore)
    this.relation = aggregateRelation
  }

  add (payload) {
    return super
      .persistEvent(CheckingAccountModel.create(payload, new AggregateMeta(v4(), 1)))
      .then(event => Promise.all(payload.users.map(user => this.relation.addRelatedId('user', user, event.aggregateId)))
        .then(() => event)
      )
  }

  findIdsByUser (user) {
    return this.relation.findByRelatedId('user', NonEmptyString(user, ['CheckingAccountRepository', 'findIdsByUser()', 'user:String']))
  }
}

module.exports = {CheckingAccountRepository}
