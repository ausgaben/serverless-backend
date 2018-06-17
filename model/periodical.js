const {AggregateRoot, NonEmptyString, AggregateMeta, ModelEvent} = require('@rheactorjs/event-store-dynamodb')
const {UnhandledDomainEventError} = require('@rheactorjs/errors')
const {irreducible, Boolean: BooleanType, Integer: IntegerType, maybe, Date: DateType} = require('tcomb')
const {PeriodicalCreatedEvent} = require('./events')
const MaybeDateType = maybe(DateType, 'MaybeDateType')

class PeriodicalModel extends AggregateRoot {
  /**
   * @param {String} checkingAccount
   * @param {String} category
   * @param {String} title
   * @param {Number} amount
   * @param {Boolean} estimate
   * @param {Date} startsAt
   * @param {Number} enabledIn
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   */
  constructor (checkingAccount, category, title, amount, estimate, startsAt, enabledIn, meta) {
    super(meta)
    this.checkingAccount = NonEmptyString(checkingAccount, ['PeriodicalModel', 'checkingAccount:String'])
    this.category = NonEmptyString(category, ['PeriodicalModel', 'category:String'])
    this.title = NonEmptyString(title, ['PeriodicalModel', 'title:String'])
    this.amount = IntegerType(amount, ['PeriodicalModel', 'amount:Integer'])
    this.estimate = BooleanType(estimate, ['PeriodicalModel', 'estimate:Boolean'])
    this.startsAt = MaybeDateType(startsAt, ['PeriodicalModel', 'startsAt:Date'])
    this.enabledIn = IntegerType(enabledIn || PeriodicalModel.monthFlags.reduce((all, flag) => all | flag, 0), ['PeriodicalModel', 'enabledIn:Integer'])
  }

  /**
   * @param {Object} data
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   * @returns {ModelEvent} the create event
   */
  static create ({checkingAccount, category, title, amount, estimate, startsAt, enabledIn}, meta) {
    const s = [].concat.bind(['PeriodicalModel', 'create()'])
    return new ModelEvent(
      meta.id,
      1,
      PeriodicalCreatedEvent,
      {
        checkingAccount: NonEmptyString(checkingAccount, s('checkingAccount:String')),
        category: NonEmptyString(category, s('category:String')),
        title: NonEmptyString(title, s('title:String')),
        amount: IntegerType(amount, s('amount:Integer')),
        estimate: BooleanType(estimate, s('estimate:Boolean')),
        startsAt: MaybeDateType(startsAt, s('startsAt:Date')),
        enabledIn: IntegerType(enabledIn || PeriodicalModel.monthFlags.reduce((all, flag) => all | flag, 0), s('enabledIn:Integer'))
      },
      meta.createdAt
    )
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
    const {name, payload: {checkingAccount, category, title, amount, estimate, startsAt, enabledIn}, createdAt, aggregateId} = event
    switch (name) {
      case PeriodicalCreatedEvent:
        return new PeriodicalModel(checkingAccount, category, title, amount, estimate, startsAt ? new Date(startsAt) : undefined, enabledIn, new AggregateMeta(aggregateId, 1, createdAt))
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
