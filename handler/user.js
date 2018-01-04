const {successHandler} = require('../util/response')
const {UserRepository} = require('../repository/user')
const {relations} = require('./jsonld')
const {User} = require('@rheactorjs/models')
const {URIValue} = require('@rheactorjs/value-objects')

module.exports = {
  list: (event, context, callback) => {
    console.log(event)
    console.log(context)
    successHandler(callback)({event, context})
  },
  account: (event, context, callback) => {
    const userRepo = context.userRepo || new UserRepository()
    const jsonld = relations(new URIValue(process.env.API_ENDPOINT))
    userRepo
      .getById(event.pathParameters.id)
      .then(user => {
        successHandler(callback)({
          ...user.toJSON(),
          $links: jsonld.createLinks(User.$context, user.email.toString())
        })
      })
  }
}
