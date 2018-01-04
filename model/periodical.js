const {AggregateRoot, NonEmptyString, AggregateMeta} = require('@rheactorjs/event-store-dynamodb')
const {UnhandledDomainEventError} = require('@rheactorjs/errors')
const {irreducible, Boolean: BooleanType, Integer: IntegerType, maybe, Date: DateType} = require('tcomb')
const {PeriodicalCreatedEvent} = require('./events')
const MaybeDateType = maybe(DateType, 'MaybeDateType')

class PeriodicalModel extends AggregateRoot {
  /**
   * @param {String} checkingAccount
   * @param {String} author
   * @param {String} category
   * @param {String} title
   * @param {Number} amount
   * @param {Boolean} estimate
   * @param {Date} startsAt
   * @param {Number} enabledIn
   * @param {Boolean} saving
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   */
  constructor (checkingAccount, author, category, title, amount, estimate, startsAt, enabledIn, saving = false, meta) {
    super(meta)
    this.checkingAccount = NonEmptyString(checkingAccount, ['PeriodicalModel', 'checkingAccount:AggregateId'])
    this.author = NonEmptyString(author, ['PeriodicalModel', 'author:AggregateId'])
    this.category = NonEmptyString(category, ['PeriodicalModel', 'category:String'])
    this.title = NonEmptyString(title, ['PeriodicalModel', 'title:String'])
    this.amount = IntegerType(amount, ['PeriodicalModel', 'amount:Integer'])
    this.estimate = BooleanType(estimate, ['PeriodicalModel', 'estimate:Boolean'])
    this.startsAt = MaybeDateType(startsAt, ['PeriodicalModel', 'startsAt:Date'])
    this.enabledIn = IntegerType(enabledIn || PeriodicalModel.monthFlags.reduce((all, flag) => all | flag, 0), ['PeriodicalModel', 'enabledIn:Integer'])
    this.saving = BooleanType(saving, ['PeriodicalModel', 'saving:Boolean'])
  }

  /**
   * Applies the event
   *
   * @param {ModelEvent} event
   * @param {PeriodicalModel|undefined} periodical
   * @return {PeriodicalModel}
   * @throws UnhandledDomainEventError
   */
  static applyEvent (event, periodical) {
    const {name, payload: {checkingAccount, author, category, title, amount, estimate, startsAt, enabledIn, saving}, createdAt, aggregateId} = event
    switch (name) {
      case PeriodicalCreatedEvent:
        return new PeriodicalModel(checkingAccount, author, category, title, amount, estimate, startsAt ? new Date(startsAt) : undefined, enabledIn, saving, new AggregateMeta(aggregateId, 1, createdAt))
      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }

  static get monthFlags () {
    return [
      1,
      2,
      4,
      8,
      16,
      32,
      64,
      128,
      256,
      512,
      1024,
      2048
    ]
  }
}

const PeriodicalModelType = irreducible('PeriodicalModelType', x => x instanceof PeriodicalModel)

module.exports = {
  PeriodicalModel,
  PeriodicalModelType
}
