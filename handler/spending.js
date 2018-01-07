'use strict'

const {successHandler, errorHandler} = require('../util/response')
const {Pagination} = require('@rheactorjs/event-store-dynamodb')
const Joi = require('joi')
const {List} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')
const {Spending} = require('@ausgaben/models')
const {relations} = require('./jsonld')
const {joi: {validate, NonEmptyString, Integer, Truthy, TruthyDefaultFalse}, authorize, checkingAccountService: service} = require('./util')

const presentSpending = relations => aggregate => new Spending({
  $id: relations.createId(Spending.$context, aggregate.meta.id),
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
          Object.assign({}, JSON.parse(event.body), {checkingAccountId: event.pathParameters.id}),
          Joi.object().keys({
            checkingAccountId: NonEmptyString,
            category: NonEmptyString,
            title: NonEmptyString,
            amount: Integer,
            booked: Truthy.required(),
            bookedAt: Joi.date(),
            saving: TruthyDefaultFalse
          })),
        authorize(event)
      ])
      .then(async ([{checkingAccountId, category, title, amount, booked, bookedAt, saving}, user]) => service(context).createSpending(user, checkingAccountId, category, title, amount, booked, bookedAt, saving))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  search: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.queryStringParameters, {checkingAccountId: event.pathParameters.id}),
          Joi.object().keys({
            checkingAccountId: NonEmptyString,
            offset: Joi.number().min(0)
          })
        ),
        authorize(event)
      ])
      .then(async ([{checkingAccountId, offset}, user]) => service(context).findSpendings(user, checkingAccountId, new Pagination(offset)))
      .then(({items, total, itemsPerPage, offset}) => new List(items.map(presentSpending(relations(new URIValue(process.env.API_ENDPOINT)))), total, itemsPerPage, [], offset))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  get: (event, context, callback) => {
    Promise
      .all([
        validate(
          event.pathParameters,
          Joi.object().keys({
            id: NonEmptyString
          })
        ),
        authorize(event)
      ])
      .then(async ([{id}, user]) => service(context).getSpendingById(user, id))
      .then(({items: [checkingAccount]}) => presentSpending(relations(new URIValue(process.env.API_ENDPOINT)))(checkingAccount))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
