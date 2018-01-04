const {AggregateRepository} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountModel} = require('../model/checking-account')

/**
 * Creates a new checkingAccount repository
 *
 * @param {EventStore} eventStore
 * @constructor
 */
class CheckingAccountRepository extends AggregateRepository {
  constructor (eventStore) {
    super(CheckingAccountModel, eventStore)
  }
}

module.exports = {CheckingAccountRepository}
