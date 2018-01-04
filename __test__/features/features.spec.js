/* global beforeAll afterAll expect describe test URL */

const chalk = require('chalk')
const Promise = require('bluebird')
const g = require('glob')
const {readFile: readFileAsync} = require('fs')
const glob = Promise.promisify(g)
const readFile = Promise.promisify(readFileAsync)
const {createStore, combineReducers} = require('redux')
const toposort = require('toposort')
const jwt = require('jsonwebtoken')
const {URIValue, EmailValue} = require('@rheactorjs/value-objects')

const {EventStore} = require('@rheactorjs/event-store-dynamodb')
const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')
const {CheckingAccountRepository} = require('../../repository/checking-account')
const {User, Link} = require('@rheactorjs/models')
const app = {}

const stepReducer = (state = {stepCount: 0, failed: false}, {type, step, argument, keyword}) => {
  switch (type) {
    case 'STEP':
      return {
        ...state,
        stepCount: state.stepCount + 1,
        step,
        argument,
        keyword: keyword === 'and' ? state.keyword : keyword
      }
    case 'STEP_FAILED':
      return {
        ...state,
        failedStep: step,
        failed: true
      }
    default:
      return state
  }
}

const lambdaProxyEventReducer = (state = {
  path: '/',
  httpMethod: 'POST',
  headers: {},
  queryStringParameters: null,
  pathParameters: null,
  body: null
}, action) => {
  switch (action.type) {
    case 'REQUEST_HEADER':
      return {...state, headers: {...state.headers, [action.name]: action.value}}
    case 'REQUEST_METHOD':
      return {...state, httpMethod: action.method}
    case 'REQUEST_RESOURCE':
      return {...state, path: action.path.split('?')[0], queryStringParameters: action.path.split('?')[1] || null}
    case 'REQUEST_BODY':
      return {...state, body: JSON.stringify(action.body)}
    default:
      return state
  }
}

const defaultResponseState = {statusCode: -1, headers: {}, body: {}}
const lambdaResponseReducer = (state = defaultResponseState, action) => {
  switch (action.type) {
    case 'RESPONSE':
      return {
        statusCode: +action.response.statusCode,
        headers: action.response.headers,
        body: action.response.body ? JSON.parse(action.response.body) : undefined
      }
    case 'REQUEST_HEADER':
    case 'REQUEST_METHOD':
    case 'REQUEST_RESOURCE':
      return defaultResponseState
    default:
      return state
  }
}

const storageReducer = (state = {}, action) => {
  switch (action.type) {
    case 'STORE':
      return {
        ...state,
        [action.key]: action.value
      }
    default:
      return state
  }
}

const users = {}
const userRepo = {
  users,
  getById: id => Promise.resolve(users[id])
}

const {successHandler} = require('../../util/response')
const apiHandler = require('../../handler/api')
const userHandler = require('../../handler/user')
const checkingAccountHandler = require('../../handler/checkingAccount')
const endpoints = [
  {path: new RegExp(`GET /api`), handler: apiHandler.api},
  {
    path: new RegExp('POST /registration'),
    handler: (event, context, callback) => {
      // In a real serverless app, registration is Cognito
      const {email, firstname, lastname} = JSON.parse(event.body)
      userRepo.users[email] = new User({
        $id: new URIValue(`${process.env.API_ENDPOINT}/user/${email}`),
        $version: 1,
        $createdAt: new Date(),
        email: new EmailValue(email),
        firstname,
        lastname
      })
      successHandler(callback)({}, {}, 201)
    }
  },
  {
    path: new RegExp('POST /activate-account'),
    handler: (event, context, callback) => {
      // In a real serverless app, registration is Cognito
      successHandler(callback)({}, {}, 204)
    }
  },
  {
    path: new RegExp('POST /login'),
    handler: (event, context, callback) => {
      // In a real serverless app, registration is Cognito
      const body = JSON.parse(event.body)
      successHandler(callback)({
        $context: 'https://tools.ietf.org/html/rfc7519',
        token: 'login',
        $links: [
          new Link(new URIValue(`${process.env.API_ENDPOINT}/user/${body.email}`), User.$context, false, 'me')
        ]
      }, {}, 201)
    }
  },
  {
    path: /GET \/user\/(.+)/,
    handler: (event, context, callback) => {
      const match = event.path.match(/\/user\/(.+)/)
      userHandler.account({...event, pathParameters: {id: match[1]}}, {...context, userRepo}, callback)
    }
  },
  {
    path: new RegExp('POST /checking-account'),
    handler: checkingAccountHandler.create
  }
]

class ServerlessContext {
  constructor (endpoints) {
    this.endpoints = endpoints
  }

  step (store, step, argument) {
    const headerRx = /^"([^"]+)" is the ([^ ]+) header$/
    if (headerRx.test(step)) {
      const match = step.match(headerRx)
      store.dispatch({type: 'REQUEST_HEADER', name: match[2], value: match[1]})
      return Promise.resolve()
    }
    const requestRx = /^I ([A-Z]+) (?:to )?([^ ]+)$/
    if (requestRx.test(step)) {
      const match = step.match(requestRx)
      const uri = new URL(match[2], process.env.API_ENDPOINT)
      store.dispatch({type: 'REQUEST_METHOD', method: match[1]})
      store.dispatch({type: 'REQUEST_RESOURCE', path: uri.pathname})
      const route = this.endpoints.find(({path}) => path.test(`${match[1]} ${uri.pathname}`))
      if (!route) {
        throw new Error(`No handler matches "${match[2]}"!`)
      }
      return new Promise((resolve, reject) => {
        route.handler(store.getState().proxyEvent, undefined, (err, response) => {
          if (err) return reject(err)
          store.dispatch({type: 'RESPONSE', response})
          return resolve()
        })
      })
    }
    if (step === 'this is the request body') {
      store.dispatch({
        type: 'REQUEST_BODY',
        body: JSON.parse(argument)
      })
      return Promise.resolve()
    }
    const statusCodeTestRx = /^the status code should be ([0-9]+)$/
    if (statusCodeTestRx.test(step)) {
      const match = step.match(statusCodeTestRx)
      return Promise.try(() => expect(store.getState().response.statusCode).toEqual(+match[1]))
    }
    const headerTestRx = /^the ([^ ]+) header should equal "([^"]+)"$/
    if (headerTestRx.test(step)) {
      const match = step.match(headerTestRx)
      return Promise.try(() => expect(store.getState().response.headers).toMatchObject({[match[1]]: match[2]}))
    }
    const responsePropertyTestRx = /^"([^"]+)" should equal "([^"]+)"$/
    if (responsePropertyTestRx.test(step)) {
      const match = step.match(responsePropertyTestRx)
      return Promise.try(() => expect(store.getState().response.body).toMatchObject({[match[1]]: match[2]}))
    }
    const responsePropertyExistTestRx = /^"([^"]+)" should (not )?exist$/
    if (responsePropertyExistTestRx.test(step)) {
      const match = step.match(responsePropertyExistTestRx)
      if (match[2]) {
        return Promise.try(() => expect(store.getState().response.body).not.toHaveProperty(match[1]))
      } else {
        return Promise.try(() => expect(store.getState().response.body).toHaveProperty(match[1]))
      }
    }

    const storeLinksRx = /^I store the link to "([^"]+)" as "([^"]+)"/
    if (storeLinksRx.test(step)) {
      const match = step.match(storeLinksRx)
      return Promise
        .try(() => {
          const body = store.getState().response.body
          expect(body).toHaveProperty('$links')
          const link = body.$links.find(({rel}) => rel === match[1])
          expect(link).toBeDefined()
          store.dispatch({
            type: 'STORE',
            value: Link.fromJSON(link).href.toString(),
            key: match[2]
          })
        })
    }

    const storeListLinksRx = /^I store the link to the list "([^"]+)" as "([^"]+)"/
    if (storeListLinksRx.test(step)) {
      const match = step.match(storeListLinksRx)
      return Promise
        .try(() => {
          const body = store.getState().response.body
          expect(body).toHaveProperty('$links')
          const link = body.$links.find(({subject}) => subject === match[1])
          if (!link) {
            console.log(`Could not find a "${match[1]}" link in this list:`, body.$links)
          }
          expect(link).toBeDefined()
          store.dispatch({
            type: 'STORE',
            value: Link.fromJSON(link).href.toString(),
            key: match[2]
          })
        })
    }

    const storePropertyRx = /^I store "([^"]+)" as "([^"]+)"/
    if (storePropertyRx.test(step)) {
      const match = step.match(storePropertyRx)
      return Promise
        .try(() => {
          const body = store.getState().response.body
          expect(body).toHaveProperty(match[1])
          store.dispatch({
            type: 'STORE',
            value: body[match[1]],
            key: match[2]
          })
        })
    }
    const appTokenRx = /^I have the ([^ ]+)Token for "([^"]+)" in "([^"]+)"/
    if (appTokenRx.test(step)) {
      const match = step.match(appTokenRx)
      store.dispatch({
        type: 'STORE',
        value: this.createToken(match[1], match[2]),
        key: match[3]
      })
      return Promise.resolve()
    }
  }

  createToken (type, subject) {
    return jwt.sign(
      {},
      'secret',
      {
        algorithm: 'HS256',
        issuer: 'login',
        subject
      }
    )
  }
}

const ctx = new ServerlessContext(endpoints)

const rootStore = createStore(combineReducers({
  steps: stepReducer,
  proxyEvent: lambdaProxyEventReducer,
  response: lambdaResponseReducer,
  storage: storageReducer
}))

beforeAll(() => dynamoDB()
  .spread((dynamoDB, eventsTable) => {
    app.checkingAccountRepo = new CheckingAccountRepository(
      new EventStore('CheckingAccount', dynamoDB, eventsTable)
    )
  }))

afterAll(close)
afterAll(() => {
  const {steps, response, proxyEvent} = rootStore.getState()
  if (steps.failed) {
    console.error(
      [
        chalk.red(`Failed step: ${steps.failedStep}`),
        chalk.cyan(`Request: ${proxyEvent.httpMethod} ${proxyEvent.path}\n> ${proxyEvent.body}`),
        chalk.blue(`Response: ${response.statusCode}\n${Object.keys(response.headers).map(header => `${header}: ${response.headers[header]}`).join('\n')}\n\n${JSON.stringify(response.body)}`)
      ].join('\n')
    )
  }
})

const Gherkin = require('gherkin')
const parser = new Gherkin.Parser(new Gherkin.AstBuilder())
const matcher = new Gherkin.TokenMatcher()

const runFeatures = async () => {
  const featureFiles = await glob('./features/*.feature')
  const featureSources = await Promise.all(featureFiles.map(file => readFile(file)))
  // Parse the feature files
  const parsedFeatures = featureSources.map(featureData => {
    const scanner = new Gherkin.TokenScanner(featureData.toString())
    return parser.parse(scanner, matcher).feature
  })

  // Sort the features by @After annotation using toposort
  const featureDependencies = parsedFeatures.map(feature => {
    const afterTag = feature.tags.find(({name}) => /^@After:/.test(name))
    if (afterTag) {
      return [afterTag.name.split(':')[1], feature.name]
    }
    return [feature.name, false]
  })
  const sortedFeatureNames = toposort(featureDependencies).filter(feature => feature)

  // Now run the features in the right order
  const sortedFeatures = sortedFeatureNames.map(featureName => parsedFeatures.find(({name}) => name === featureName))

  await Promise
    .mapSeries(
      sortedFeatures,
      feature => Promise
        .mapSeries(
          feature.children,
          scenario => {
            const runScenario = (type, name, steps, dataset = {}) => Promise
              .mapSeries(
                steps,
                ({text: step, argument, keyword}) => new Promise((resolve, reject) => {
                  // Replace Gherkin arguments in strings
                  const replaceArguments = str => Object.keys(dataset).reduce((str, key) => str.replace(`<${key}>`, dataset[key]), str)

                  // Replace {foo} storage placeholders
                  const storage = rootStore.getState().storage
                  const replacePlaceholders = str => Object.keys(storage).reduce((str, key) => str.replace(`{${key}}`, storage[key]), str)

                  // Replace
                  // In step
                  const stepText = replacePlaceholders(replaceArguments(step.trim()))
                  // in argument
                  const arg = argument ? replacePlaceholders(replaceArguments(argument.content)) : undefined

                  rootStore.dispatch({
                    type: 'STEP',
                    step: stepText,
                    argument: arg,
                    keyword: keyword.trim().toLowerCase()
                  })

                  const p = ctx.step(rootStore, stepText, arg)
                  if (!p || !p.then) {
                    rootStore.dispatch({
                      type: 'STEP_FAILED',
                      step: stepText
                    })
                    return reject(new Error(`Unmatched step: ${stepText}!`))
                  }
                  p
                    .then(result => {
                      rootStore.dispatch({
                        type: 'STEP_SUCCESS',
                        step: stepText,
                        result
                      })
                      resolve(result)
                    })
                })
              )

            if (scenario.type === 'ScenarioOutline') {
              // Execute the scenario for every provided example dataset
              const examples = scenario.examples
                .find(({type}) => type === 'Examples')
              const tableBody = examples.tableBody.filter(({type}) => type === 'TableRow')

              const exampleDatasets = tableBody.map(({cells}) => cells.reduce((dataset, {value}, idx) => {
                dataset[examples.tableHeader.cells[idx].value] = value
                return dataset
              }, {}))

              return Promise.mapSeries(
                exampleDatasets,
                dataset => runScenario(scenario.type, scenario.name, scenario.steps, dataset)
              )
            } else {
              return runScenario(scenario.type, scenario.name, scenario.steps)
            }
          }
        )
    )
}

describe('Features', () => {
  test('they should run', async () => {
    await runFeatures()
    expect(rootStore.getState().steps.failed).toEqual(false)
  })
})
