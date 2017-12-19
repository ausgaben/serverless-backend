const {successHandler} = require('../util/response')

module.exports = {
  list: (event, context, callback) => {
    console.log(event)
    console.log(context)
    successHandler(callback)({event, context})
  }
}
