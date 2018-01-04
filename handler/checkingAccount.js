const {successHandler} = require('../util/response')

module.exports = {
  create: (event, context, callback) => {
    successHandler(callback)()
  }
}
