'use strict'

const {HttpProblem, URLValue} = require('@rheactorjs/models')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Required for CORS support to work
  'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
}

const headers = body => {
  let h = Object.assign({}, corsHeaders)
  if (body) {
    h = Object.assign(h, {'Content-Type': 'application/vnd.ausgaben.v1+json'})
  }
  return h
}

module.exports = {
  errorHandler: callback => error => {
    console.error(error)
    let statusCode = 500
    const $context = new URLValue(`https://github.com/Ausgaben/models#${error.name}`)
    const body = JSON.stringify(new HttpProblem(
      $context, error.message, statusCode, `${error}`
    ))
    callback(null, {
      statusCode,
      headers: headers(body),
      body: JSON.stringify(body)
    })
  },
  successHandler: callback => body => {
    callback(null, {
      statusCode: body ? 200 : 202,
      headers: headers(body),
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  }
}
