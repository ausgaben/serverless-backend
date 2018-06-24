'use strict'

const {successHandler, errorHandler} = require('./response')
const {Pagination} = require('@rheactorjs/event-store-dynamodb')
const Joi = require('joi')
const {List} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')
const {Periodical} = require('@ausgaben/models')
const {PeriodicalModel} = require('../model/periodical')
const {relations} = require('./jsonld')
const {joi: {validate, NonEmptyString, Integer, Boolean}, authorize, checkingAccountService: service} = require('./util')

const presentPeriodical = relations => aggregate => new Periodical({
  $id: relations.createId(Periodical.$context, aggregate.meta.id),
  $version: aggregate.meta.version,
  $links: relations.createLinks(Periodical.$context, aggregate.meta.id),
  $createdAt: aggregate.meta.createdAt,
  $updatedAt: aggregate.meta.updatedAt,
  $deletedAt: aggregate.meta.deletedAt,
  category: aggregate.category,
  title: aggregate.title,
  amount: aggregate.amount,
  estimate: aggregate.estimate,
  startsAt: aggregate.startsAt ? new Date(aggregate.startsAt) : undefined,
  enabledIn01: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[0]),
  enabledIn02: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[1]),
  enabledIn03: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[2]),
  enabledIn04: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[3]),
  enabledIn05: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[4]),
  enabledIn06: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[5]),
  enabledIn07: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[6]),
  enabledIn08: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[7]),
  enabledIn09: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[8]),
  enabledIn10: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[9]),
  enabledIn11: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[10]),
  enabledIn12: !!(aggregate.enabledIn & PeriodicalModel.monthFlags[11]),
  saving: aggregate.saving
})

module.exports = {
  create: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, JSON.parse(event.body), {checkingAccountId: event.pathParameters.id}),
          Joi.object().keys({
            checkingAccountId: NonEmptyString.required(),
            category: NonEmptyString.required(),
            title: NonEmptyString.required(),
            amount: Integer.required(),
            estimate: Boolean.default(false),
            startsAt: Joi.date(),
            saving: Boolean.default(false),
            enabledIn01: Boolean.default(false),
            enabledIn02: Boolean.default(false),
            enabledIn03: Boolean.default(false),
            enabledIn04: Boolean.default(false),
            enabledIn05: Boolean.default(false),
            enabledIn06: Boolean.default(false),
            enabledIn07: Boolean.default(false),
            enabledIn08: Boolean.default(false),
            enabledIn09: Boolean.default(false),
            enabledIn10: Boolean.default(false),
            enabledIn11: Boolean.default(false),
            enabledIn12: Boolean.default(false)
          })),
        authorize(event)
      ])
      .then(([{
        checkingAccountId,
        category,
        title,
        amount,
        estimate,
        startsAt,
        saving,
        enabledIn01,
        enabledIn02,
        enabledIn03,
        enabledIn04,
        enabledIn05,
        enabledIn06,
        enabledIn07,
        enabledIn08,
        enabledIn09,
        enabledIn10,
        enabledIn11,
        enabledIn12
      }, user]) => service(context).createPeriodical(
        user,
        checkingAccountId,
        category,
        title,
        amount,
        estimate,
        startsAt,
        saving,
        enabledIn01,
        enabledIn02,
        enabledIn03,
        enabledIn04,
        enabledIn05,
        enabledIn06,
        enabledIn07,
        enabledIn08,
        enabledIn09,
        enabledIn10,
        enabledIn11,
        enabledIn12))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  },
  search: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.queryStringParameters, {checkingAccountId: event.pathParameters.id}),
          Joi.object().keys({
            checkingAccountId: NonEmptyString.required(),
            offset: Joi.number().min(0)
          })
        ),
        authorize(event)
      ])
      .then(([{checkingAccountId, offset}, user]) => service(context).findPeriodicals(user, checkingAccountId, new Pagination(offset)))
      .then(({items, total, itemsPerPage, offset}) => new List(items.map(presentPeriodical(relations(new URIValue(process.env.API_ENDPOINT)))), total, itemsPerPage, [], offset))
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
      .then(([{id}, user]) => service(context).getPeriodicalById(user, id))
      .then(periodical => presentPeriodical(relations(new URIValue(process.env.API_ENDPOINT)))(periodical))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
