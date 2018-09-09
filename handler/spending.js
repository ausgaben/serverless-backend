'use strict'

const { successHandler, errorHandler } = require('./response')
const { Pagination } = require('@rheactorjs/event-store-dynamodb')
const Joi = require('joi')
const { List, ID } = require('@rheactorjs/models')
const { URIValue } = require('@rheactorjs/value-objects')
const { Spending } = require('@ausgaben/models')
const { relations } = require('./jsonld')
const { joi: { validate, NonEmptyString, Integer, Boolean }, authorize, checkingAccountService: service } = require('./util')

const presentSpending = relations => aggregate => new Spending({
  $id: new ID(
    aggregate.meta.id,
    relations.createIdLink(Spending.$context, aggregate.meta.id)
  ),
  $version: aggregate.meta.version,
  $links: relations.createLinks(Spending.$context, aggregate.meta.id),
  $createdAt: aggregate.meta.createdAt,
  $updatedAt: aggregate.meta.updatedAt,
  $deletedAt: aggregate.meta.deletedAt,
  category: aggregate.category,
  title: aggregate.title,
  amount: aggregate.amount,
  booked: aggregate.booked,
  bookedAt: aggregate.bookedAt ? new Date(aggregate.bookedAt) : undefined,
  saving: aggregate.saving
})

module.exports = {
  create: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, JSON.parse(event.body), { checkingAccountId: event.pathParameters.id }),
          Joi.object().keys({
            checkingAccountId: NonEmptyString.required(),
            category: NonEmptyString.required(),
            title: NonEmptyString.required(),
            amount: Integer.required(),
            booked: Boolean.required(),
            bookedAt: Joi.date(),
            saving: Boolean.default(false)
          })),
        authorize(event)
      ])
      .then(([{ checkingAccountId, category, title, amount, booked, bookedAt, saving }, user]) => service(context).createSpending(user, checkingAccountId, category, title, amount, booked, bookedAt, saving))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  search: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.queryStringParameters, { checkingAccountId: event.pathParameters.id }),
          Joi.object().keys({
            checkingAccountId: NonEmptyString.required(),
            q: NonEmptyString,
            offset: Joi.number().min(0)
          })
        ),
        authorize(event)
      ])
      .then(([{ checkingAccountId, q, offset }, user]) => service(context).findSpendings(user, checkingAccountId, q, new Pagination(offset)))
      .then(({ items, total, itemsPerPage, offset }) => new List(items.map(presentSpending(relations(new URIValue(process.env.API_ENDPOINT)))), total, itemsPerPage, [], offset))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  get: (event, context, callback) => {
    Promise
      .all([
        validate(
          event.pathParameters,
          Joi.object().keys({
            id: NonEmptyString.required()
          })
        ),
        authorize(event)
      ])
      .then(([{ id }, user]) => service(context).getSpendingById(user, id))
      .then(spending => presentSpending(relations(new URIValue(process.env.API_ENDPOINT)))(spending))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  update: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, JSON.parse(event.body), event.pathParameters, { version: event.headers['If-Match'] }),
          Joi.object().keys({
            id: NonEmptyString.required(),
            category: NonEmptyString,
            title: NonEmptyString,
            amount: Integer,
            booked: Boolean,
            bookedAt: Joi.date(),
            saving: Boolean,
            version: Integer.required()
          })
        ),
        authorize(event)
      ])
      .then(([{ id, category, title, amount, booked, bookedAt, saving, version }, user]) => service(context).updateSpending(user, id, version, category, title, amount, booked, bookedAt, saving))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  delete: (event, context, callback) => {
    Promise
      .all([
        validate(
          event.pathParameters,
          Joi.object().keys({
            id: NonEmptyString.required()
          })
        ),
        authorize(event)
      ])
      .then(([{ id }, user]) => service(context).deleteSpendingById(user, id))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
