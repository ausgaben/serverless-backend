'use strict'

const {CheckingAccountService} = require('../service/checking-account')
const {DynamoDB} = require('aws-sdk')
const {ValidationFailedError} = require('@rheactorjs/errors')
const Joi = require('joi')

const checkingAccountService = context => new CheckingAccountService(
  context.dynamoDB || new DynamoDB(),
  process.env.TABLE_EVENTS || 'ausgaben-events',
  process.env.TABLE_RELATIONS || 'ausgaben-relations',
  process.env.TABLE_INDEX || 'ausgaben-index'
)

const NonEmptyString = Joi.string().min(1).trim()
const Boolean = Joi.boolean().falsy([0, '0']).truthy([1, '1'])
const Integer = Joi.number().integer()
const validate = (data, schema) => {
  const result = Joi.validate(data || {}, schema)
  if (result.error) {
    return Promise.reject(new ValidationFailedError('Validation failed', data, result.error))
  }
  return Promise.resolve(result)
}

const authorize = event => Promise.resolve(event.requestContext.authorizer.claims.sub)

module.exports = {
  authorize,
  checkingAccountService,
  joi: {
    validate,
    NonEmptyString,
    Boolean,
    Integer
  }
}
