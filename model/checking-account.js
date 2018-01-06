const {ValidationFailedError, UnhandledDomainEventError} = require('@rheactorjs/errors')
const {AggregateRoot, ModelEvent, AggregateMeta, NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountPropertyChangedEvent, CheckingAccountCreatedEvent} = require('./events')
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
   * Applies the event
   *
   * @param {ModelEvent} event
   * @param {CheckingAccountModel|undefined} checkingAccount
   * @return {CheckingAccountModel}
   * @throws UnhandledDomainEventError
   */
  static applyEvent (event, checkingAccount) {
    const {payload: {name, users, monthly, savings, property, value}, createdAt, aggregateId} = event
    switch (event.name) {
      case CheckingAccountCreatedEvent:
        return new CheckingAccountModel(name, users, monthly, savings, new AggregateMeta(aggregateId, 1, createdAt))
      case CheckingAccountPropertyChangedEvent:
        const d = {
          name: checkingAccount.name,
          users: checkingAccount.users,
          monthly: checkingAccount.monthly,
          savings: checkingAccount.savings
        }
        d[property] = value
        return new CheckingAccountModel(d.name, d.users, d.monthly, d.savings, checkingAccount.meta.updated(createdAt))
      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }

  /**
   * @param  {boolean} monthly
   * @returns {ModelEvent}
   * @throws ValidationFailedError
   * @throws TypeError
   */
  setMonthly (monthly = false) {
    BooleanType(monthly, ['CheckingAccountModel.setMonthly()', 'monthly:Boolean'])
    if (this.monthly === monthly) {
      throw new ValidationFailedError('Monthly unchanged', monthly)
    }
    return new ModelEvent(this.meta.id, CheckingAccountPropertyChangedEvent, {property: 'monthly', value: monthly})
  }

  /**
   * @param  {boolean} savings
   * @returns {ModelEvent}
   * @throws ValidationFailedError
   * @throws TypeError
   */
  setSavings (savings = false) {
    BooleanType(savings, ['CheckingAccountModel.setSavings()', 'savings:Boolean'])
    if (this.savings === savings) {
      throw new ValidationFailedError('Savings unchanged', savings)
    }
    return new ModelEvent(this.meta.id, CheckingAccountPropertyChangedEvent, {property: 'savings', value: savings})
  }
}

module.exports = {CheckingAccountModel}
