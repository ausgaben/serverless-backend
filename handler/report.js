'use strict'

const {successHandler, errorHandler} = require('./response')
const Joi = require('joi')
const {joi: {validate, NonEmptyString}, authorize, checkingAccountService: service} = require('./util')
const {relations} = require('./jsonld')
const {Report, CheckingAccount} = require('@ausgaben/models')
const {Reference} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')

const presentReport = relations => aggregate => new Report({
  balance: aggregate.balance,
  income: aggregate.income,
  spendings: aggregate.spendings,
  savings: aggregate.savings,
  checkingAccount: new Reference(CheckingAccount.$context, relations.createId(CheckingAccount.$context, aggregate.checkingAccount))
})

module.exports = {
  get: (event, context, callback) => {
    Promise
      .all([
        validate(
          Object.assign({}, event.queryStringParameters, {id: event.pathParameters.id}),
          Joi.object().keys({
            id: NonEmptyString.required(),
            q: NonEmptyString
          })
        ),
        authorize(event)
      ])
      .then(([{id, q}, user]) => service(context).getReport(user, id, q))
      .then(report => presentReport(relations(new URIValue(process.env.API_ENDPOINT)))(report))
      .then(successHandler(callback))
      .catch(errorHandler(callback))
  }
}
