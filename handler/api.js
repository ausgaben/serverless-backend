'use strict'

const {successHandler} = require('./response')
const {relations} = require('./jsonld')
const {URIValue} = require('@rheactorjs/value-objects')

module.exports = {
  index: (event, context, callback) => {
    successHandler(callback)(
      relations(new URIValue(process.env.API_ENDPOINT)).index(),
      {
        'Cache-Control': 'public, max-age=3600'
      }
    )
  }
}
