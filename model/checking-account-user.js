const {AggregateRoot, AggregateMeta, NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountUserCreatedEvent} = require('./events')
const {UnhandledDomainEventError} = require('@rheactorjs/errors')

class CheckingAccountUserModel extends AggregateRoot {
  /**
   * @param {String} checkingAccount
   * @param {String} user
   * @param {AggregateMeta} meta
   * @throws TypeError
   */
  constructor (checkingAccount, user, meta) {
    super(meta)
    this.checkingAccount = NonEmptyString(checkingAccount, ['CheckingAccountUserModel()', 'checkingAccount:NonEmptyString'])
    this.user = NonEmptyString(user, ['CheckingAccountUserModel()', 'user:NonEmptyString'])
  }

  /**
   * Applies the event
   *
   * @param {ModelEvent} event
   * @param {CheckingAccountUserModel|undefined} checkingAccountUser
   * @return {CheckingAccountUserModel}
   * @throws UnhandledDomainEventError
   */
  static applyEvent (event, checkingAccountUser) {
    const {name, payload: {checkingAccount, user}, createdAt, aggregateId} = event
    switch (name) {
      case CheckingAccountUserCreatedEvent:
        return new CheckingAccountUserModel(checkingAccount, user, new AggregateMeta(aggregateId, 1, createdAt))
      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }
}

module.exports = {CheckingAccountUserModel}
