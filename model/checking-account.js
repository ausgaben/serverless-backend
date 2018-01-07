const {UnhandledDomainEventError} = require('@rheactorjs/errors')
const {AggregateRoot, ModelEvent, AggregateMeta, NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountUpdatedEvent, CheckingAccountCreatedEvent} = require('./events')
const {Boolean: BooleanType} = require('tcomb')
const t = require('tcomb')
const NonEmptyListOfNonEmptyStrings = t.refinement(t.list(NonEmptyString), l => l.length > 0, 'NonEmptyListOfNonEmptyStrings')

class CheckingAccountModel extends AggregateRoot {
  /**
   * @param {String} name
   * @param {String[]} users
   * @param {Boolean} monthly
   * @param {Boolean} savings
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   */
  constructor (name, users, monthly = false, savings = false, meta) {
    super(meta)
    this.name = NonEmptyString(name, ['CheckingAccountModel()', 'name:String'])
    this.users = NonEmptyListOfNonEmptyStrings(users, ['CheckingAccountModel()', 'users:String[]'])
    this.monthly = BooleanType(monthly, ['CheckingAccountModel()', 'monthly:Boolean'])
    this.savings = BooleanType(savings, ['CheckingAccountModel()', 'savings:Boolean'])
  }

  /**
   * @param {Object} data
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   * @returns {ModelEvent} the create event
   */
  static create ({name, users, monthly = false, savings = false}, meta) {
    const s = [].concat.bind(['CheckingAccountModel', 'create()'])
    return new ModelEvent(
      meta.id,
      1,
      CheckingAccountCreatedEvent,
      {
        name: NonEmptyString(name, s('name:String')),
        users: NonEmptyListOfNonEmptyStrings(users, s('users:String[]')),
        monthly: BooleanType(monthly, s('monthly:Boolean')),
        savings: BooleanType(savings, s('savings:Boolean'))
      },
      meta.createdAt
    )
  }

  /**
   * @param {Object} payload
   * @returns {ModelEvent}
   */
  update ({name, users, monthly, savings}) {
    const s = [].concat.bind(['CheckingAccountModel', 'update()'])
    return new ModelEvent(
      this.meta.id,
      this.meta.version + 1,
      CheckingAccountUpdatedEvent,
      {
        name: name !== undefined ? NonEmptyString(name, s('name:String')) : this.name,
        users: users !== undefined ? NonEmptyListOfNonEmptyStrings(users, s('users:String[]')) : this.users,
        monthly: monthly !== undefined ? BooleanType(monthly, s('monthly:Boolean')) : this.monthly,
        savings: savings !== undefined ? BooleanType(savings, s('savings:Boolean')) : this.savings
      })
  }

  /**
   * Applies the event
   *
   * @param {ModelEvent} event
   * @param {CheckingAccountModel|undefined} checkingAccount
   * @return {CheckingAccountModel}
   * @throws UnhandledDomainEventError
   */
  static applyEvent (event, checkingAccount) {
    const {payload: {name, users, monthly, savings}, createdAt, aggregateId} = event
    switch (event.name) {
      case CheckingAccountCreatedEvent:
        return new CheckingAccountModel(name, users, monthly, savings, new AggregateMeta(aggregateId, 1, createdAt))
      case CheckingAccountUpdatedEvent:
        const d = {
          name, users, monthly, savings
        }
        return new CheckingAccountModel(d.name, d.users, d.monthly, d.savings, checkingAccount.meta.updated(createdAt))

      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }
}

module.exports = {CheckingAccountModel}
