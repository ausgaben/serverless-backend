const {AggregateRoot, ModelEvent, AggregateMeta, NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {UnhandledDomainEventError} = require('@rheactorjs/errors')
const {SpendingCreatedEvent, SpendingUpdatedEvent, SpendingDeletedEvent} = require('./events')
const {Boolean: BooleanType, Integer: IntegerType, maybe, Date: DateType, irreducible} = require('tcomb')

const MaybeDateType = maybe(DateType, 'MaybeDateType')

class SpendingModel extends AggregateRoot {
  /**
   * @param {String} checkingAccount
   * @param {String} category
   * @param {String} title
   * @param {Number} amount
   * @param {Boolean} booked
   * @param {Date} bookedAt
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   */
  constructor (checkingAccount, category, title, amount, booked = false, bookedAt, meta) {
    super(meta)
    this.checkingAccount = NonEmptyString(checkingAccount, ['SpendingModel', 'checkingAccount:String'])
    this.category = NonEmptyString(category, ['SpendingModel', 'category:String'])
    this.title = NonEmptyString(title, ['SpendingModel', 'title:String'])
    this.amount = IntegerType(amount, ['SpendingModel', 'amount:Integer'])
    this.booked = BooleanType(booked, ['SpendingModel', 'booked:Boolean'])
    this.bookedAt = MaybeDateType(bookedAt, ['SpendingModel', 'Date:Date'])
  }

  /**
   * @param {Object} data
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   * @returns {ModelEvent} the create event
   */
  static create ({checkingAccount, category, title, amount, booked = false, bookedAt}, meta) {
    const s = [].concat.bind(['SpendingModel', 'create()'])
    return new ModelEvent(
      meta.id,
      1,
      SpendingCreatedEvent,
      {
        checkingAccount: NonEmptyString(checkingAccount, s('checkingAccount:String')),
        category: NonEmptyString(category, s('category:String')),
        title: NonEmptyString(title, s('title:String')),
        amount: IntegerType(amount, s('amount:Integer')),
        booked: BooleanType(booked, s('booked:Boolean')),
        bookedAt: MaybeDateType(bookedAt, s('Date:Date'))
      },
      meta.createdAt
    )
  }

  /**
   * @param {Object} payload
   * @returns {ModelEvent}
   */
  update ({category, title, amount, booked, bookedAt}) {
    const s = [].concat.bind(['SpendingModel', 'update()'])
    return new ModelEvent(
      this.meta.id,
      this.meta.version + 1,
      SpendingUpdatedEvent,
      {
        category: category !== undefined ? NonEmptyString(category, s('category:String')) : this.category,
        title: title !== undefined ? NonEmptyString(title, s('title:String')) : this.title,
        amount: amount !== undefined ? IntegerType(amount, s('amount:Integer')) : this.amount,
        booked: booked !== undefined ? BooleanType(booked, s('booked:Boolean')) : this.booked,
        bookedAt: bookedAt ? bookedAt.toISOString() : (this.bookedAt ? DateType(this.bookedAt, s('bookedAt:Date')).toISOString() : undefined)
      })
  }

  /**
   * @returns {ModelEvent}
   */
  delete () {
    return new ModelEvent(this.meta.id, this.meta.version + 1, SpendingDeletedEvent)
  }

  /**
   * Applies the event
   *
   * @param {ModelEvent} event
   * @param {SpendingModel|undefined} spending
   * @return {SpendingModel}
   * @throws UnhandledDomainEventError
   */
  static applyEvent (event, spending) {
    const {name, payload: {checkingAccount, category, title, amount, booked, bookedAt}, createdAt, aggregateId} = event
    switch (name) {
      case SpendingCreatedEvent:
        return new SpendingModel(checkingAccount, category, title, amount, booked, bookedAt ? new Date(bookedAt) : undefined, new AggregateMeta(aggregateId, 1, createdAt))
      case SpendingDeletedEvent:
        return new SpendingModel(spending.checkingAccount, spending.category, spending.title, spending.amount, spending.booked, spending.bookedAt, spending.meta.deleted(createdAt))
      case SpendingUpdatedEvent:
        const d = {
          category, title, amount, booked, bookedAt
        }
        return new SpendingModel(spending.checkingAccount, d.category, d.title, d.amount, d.booked, d.bookedAt ? new Date(d.bookedAt) : undefined, spending.meta.updated(createdAt))
      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }
}

const SpendingModelType = irreducible('SpendingModelType', x => x instanceof SpendingModel)

module.exports = {SpendingModel, SpendingModelType}
