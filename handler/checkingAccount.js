'use strict'

const {successHandler, errorHandler} = require('./response')
const {Pagination} = require('@rheactorjs/event-store-dynamodb')
const Joi = require('joi')
const {List} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')
const {CheckingAccount, Title} = require('@ausgaben/models')
const {relations} = require('./jsonld')
const {joi: {validate, NonEmptyString, Integer}, authorize, checkingAccountService: service} = require('./util')

const presentCheckingAccount = relations => aggregate => new CheckingAccount({
  $id: relations.createId(CheckingAccount.$context, aggregate.meta.id),
  $version: aggregate.meta.version,
  $links: relations.createLinks(CheckingAccount.$context, aggregate.meta.id),
  $createdAt: aggregate.meta.createdAt,
  $updatedAt: aggregate.meta.updatedAt,
  $deletedAt: aggregate.meta.deletedAt,
  identifier: aggregate.meta.id,
  name: aggregate.name,
  currency: aggregate.currency,
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
            name: NonEmptyString.required()
          })),
        authorize(event)
      ])
      .then(([data, user]) => service(context).create(data.name, user))
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
      .then(([{offset}, user]) => service(context).find(user, '', new Pagination(offset)))
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
            id: NonEmptyString.required()
          })
        ),
        authorize(event)
      ])
      .then(([{id}, user]) => service(context).getById(user, id))
      .then(checkingAccount => presentCheckingAccount(relations(new URIValue(process.env.API_ENDPOINT)))(checkingAccount))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  update: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.pathParameters, JSON.parse(event.body), {version: event.headers['If-Match']}),
          Joi.object().keys({
            id: NonEmptyString.required(),
            property: NonEmptyString.required(),
            value: Joi.any().required(),
            version: Integer.required()
          })
        ),
        authorize(event)
      ])
      .then(([{id, property, value, version}, user]) => service(context).update(user, id, version, property, value))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  searchTitles: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.queryStringParameters, event.pathParameters),
          Joi.object().keys({
            id: NonEmptyString.required(),
            q: NonEmptyString.required()
          })
        ),
        authorize(event)
      ])
      .then(([{id, q}, user]) => service(context).searchTitles(user, id, q, new Pagination(0))
        .then(({items, total, itemsPerPage, offset}) => new List(items.map(({title}) => new Title(title)), total, itemsPerPage, [], offset))
      )
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
