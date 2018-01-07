const {AggregateRepository} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountModel} = require('../model/checking-account')
const {NonEmptyString} = require('@rheactorjs/event-store-dynamodb')

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

  add ({name, user}) {
    return super
      .add({
        name: NonEmptyString(name, ['CheckingAccountRepository', 'add()', 'name:String']),
        users: [NonEmptyString(user, ['CheckingAccountRepository', 'add()', 'user:String'])]
      })
      .then(event => this.relation.addRelatedId('user', user, event.aggregateId)
        .then(() => event)
      )
  }

  findIdsByUser (user) {
    return this.relation.findByRelatedId('user', NonEmptyString(user, ['CheckingAccountRepository', 'findIdsByUser()', 'user:String']))
  }
}

module.exports = {CheckingAccountRepository}
