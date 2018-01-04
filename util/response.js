'use strict'

const {HttpProblem, URLValue} = require('@rheactorjs/models')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Required for CORS support to work
  'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
}

const h = body => {
  let h = Object.assign({}, corsHeaders)
  if (body) {
    h = Object.assign(h, {'Content-Type': 'application/vnd.ausgaben.v1+json; charset=utf-8'})
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
      headers: h(body),
      body: JSON.stringify(body)
    })
  },
  successHandler: callback => (body, headers = {}, statusCodeWithBody = 200) => {
    callback(null, {
      statusCode: body ? statusCodeWithBody : 202,
      headers: {
        ...headers,
        ...h(body)
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  }
}
