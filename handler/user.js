'use strict'

const { successHandler, errorHandler } = require('./response')
const { ID, User } = require('@rheactorjs/models')
const { URIValue, EmailValue } = require('@rheactorjs/value-objects')
const { relations } = require('./jsonld')
const { authorize } = require('./util')

module.exports = {
  me: (event, context, callback) => {
    authorize(event)
      .then(user => {
        successHandler(callback)(new User({
          $id: new ID(user, `${process.env.API_ENDPOINT}/user/${user}`),
          $version: 1,
          $createdAt: new Date(),
          email: new EmailValue(event.requestContext.authorizer.claims.email),
          name: event.requestContext.authorizer.claims.name,
          $links: relations(new URIValue(process.env.API_ENDPOINT)).createLinks(User.$context, user)
        }))
      })
      .catch(errorHandler(callback))
  }
}
