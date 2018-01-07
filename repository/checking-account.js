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

  async add ({name, user}) {
    const event = await super.add({
      name: NonEmptyString(name, ['CheckingAccountRepository', 'add()', 'name:String']),
      users: [NonEmptyString(user, ['CheckingAccountRepository', 'add()', 'user:String'])]
    })
    await this.relation.addRelatedId('user', user, event.aggregateId)
    return event
  }

  async findIdsByUser (user) {
    return this.relation.findByRelatedId('user', NonEmptyString(user, ['CheckingAccountRepository', 'findIdsByUser()', 'user:String']))
  }
}

module.exports = {CheckingAccountRepository}
