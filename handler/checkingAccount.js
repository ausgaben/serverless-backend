'use strict'

const {successHandler, errorHandler} = require('../util/response')
const {Pagination} = require('@rheactorjs/event-store-dynamodb')
const Joi = require('joi')
const {List} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')
const {CheckingAccount} = require('@ausgaben/models')
const {relations} = require('./jsonld')
const {joi: {validate, NonEmptyString}, authorize, checkingAccountService: service} = require('./util')

const presentCheckingAccount = relations => aggregate => new CheckingAccount({
  $id: relations.createId(CheckingAccount.$context, aggregate.meta.id),
  $version: aggregate.meta.version,
  $links: relations.createLinks(CheckingAccount.$context, aggregate.meta.id),
  $createdAt: aggregate.meta.createdAt,
  $updatedAt: aggregate.meta.updatedAt,
  $deletedAt: aggregate.meta.deletedAt,
  identifier: aggregate.meta.id,
  name: aggregate.name,
  monthly: aggregate.monthly,
  savings: aggregate.savings
})

module.exports = {
  create: (event, context, callback) => {
    Promise
      .all([
        validate(
          JSON.parse(event.body),
          Joi.object().keys({
            name: NonEmptyString
          })),
        authorize(event)
      ])
      .then(async ([data, user]) => {
        await service(context).create(data.name, user)
      })
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  search: (event, context, callback) => {
    Promise
      .all([
        validate(
          event.queryStringParameters,
          Joi.object().keys({
            offset: Joi.number().min(0)
          })
        ),
        authorize(event)
      ])
      .then(async ([{offset}, user]) => service(context).findByUser(user, '', new Pagination(offset)))
      .then(({items, total, itemsPerPage, offset}) => new List(items.map(presentCheckingAccount(relations(new URIValue(process.env.API_ENDPOINT)))), total, itemsPerPage, [], offset))
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
      .then(async ([{id}, user]) => service(context).findByUser(user, `id:${id}`, new Pagination(0, 1)))
      .then(({items}) => presentCheckingAccount(relations(new URIValue(process.env.API_ENDPOINT)))(items[0]))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
