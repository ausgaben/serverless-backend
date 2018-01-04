const {AggregateRoot, ModelEvent, AggregateMeta, NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const {UnhandledDomainEventError} = require('@rheactorjs/errors')
const {SpendingCreatedEvent, SpendingUpdatedEvent, SpendingDeletedEvent} = require('./events')
const {Boolean: BooleanType, Integer: IntegerType, maybe, Date: DateType, irreducible} = require('tcomb')

const MaybeDateType = maybe(DateType, 'MaybeDateType')

class SpendingModel extends AggregateRoot {
  /**
   * @param {String} checkingAccount
   * @param {String} author
   * @param {String} category
   * @param {String} title
   * @param {Number} amount
   * @param {Boolean} booked
   * @param {Date} bookedAt
   * @param {Boolean} saving
   * @param {AggregateMeta} meta
   * @throws TypeError if the creation fails due to invalid payload
   */
  constructor (checkingAccount, author, category, title, amount, booked = false, bookedAt, saving = false, meta) {
    super(meta)
    this.checkingAccount = NonEmptyString(checkingAccount, ['SpendingModel', 'checkingAccount:AggregateId'])
    this.author = NonEmptyString(author, ['SpendingModel', 'author:AggregateId'])
    this.category = NonEmptyString(category, ['SpendingModel', 'category:String'])
    this.title = NonEmptyString(title, ['SpendingModel', 'title:String'])
    this.amount = IntegerType(amount, ['SpendingModel', 'amount:Integer'])
    this.booked = BooleanType(booked, ['SpendingModel', 'booked:Boolean'])
    this.bookedAt = MaybeDateType(bookedAt, ['SpendingModel', 'Date:Date'])
    this.saving = BooleanType(saving, ['SpendingModel', 'saving:Boolean'])
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
    const {name, payload: {checkingAccount, author, category, title, amount, booked, bookedAt, saving}, createdAt, aggregateId} = event
    switch (name) {
      case SpendingCreatedEvent:
        return new SpendingModel(checkingAccount, author, category, title, amount, booked, bookedAt ? new Date(bookedAt) : undefined, saving, new AggregateMeta(aggregateId, 1, createdAt))
      case SpendingDeletedEvent:
        return new SpendingModel(spending.checkingAccount, spending.author, spending.category, spending.title, spending.amount, spending.booked, spending.bookedAt, spending.saving, spending.meta.deleted(createdAt))
      case SpendingUpdatedEvent:
        const d = {
          checkingAccount, author, category, title, amount, booked, bookedAt, saving
        }
        return new SpendingModel(d.checkingAccount, d.author, d.category, d.title, d.amount, d.booked, d.bookedAt ? new Date(d.bookedAt) : undefined, d.saving, spending.meta.updated(createdAt))
      default:
        throw new UnhandledDomainEventError(event.name)
    }
  }

  /**
   * @param {Object} payload
   * @returns {ModelEvent}
   */
  update (payload) {
    return new ModelEvent(this.meta.id, SpendingUpdatedEvent, {
      checkingAccount: this.checkingAccount,
      author: this.author,
      category: payload.category || this.category,
      title: payload.title || this.title,
      amount: payload.amount || this.amount,
      booked: payload.booked !== undefined ? payload.booked : this.booked,
      bookedAt: payload.bookedAt ? payload.bookedAt.toISOString() : (this.bookedAt ? this.bookedAt.toISOString() : undefined),
      saving: payload.saving !== undefined ? payload.saving : this.saving
    }, new Date())
  }
}

const SpendingModelType = irreducible('SpendingModelType', x => x instanceof SpendingModel)

module.exports = {SpendingModel, SpendingModelType}
