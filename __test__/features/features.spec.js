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
const {List} = require('@rheactorjs/models')
const uuid = require('uuid')

const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')
const {User, Link} = require('@rheactorjs/models')
const app = {}

const stepReducer = (state = {stepCount: 0, failed: false}, {type, step, argument, keyword}) => {
  switch (type) {
    case 'STEP':
      return Object.assign(
        {},
        state,
        {
          stepCount: state.stepCount + 1,
          step,
          argument,
          keyword: keyword === 'and' ? state.keyword : keyword
        })
    case 'STEP_FAILED':
      return Object.assign(
        {},
        state,
        {
          failedStep: step,
          failed: true
        })
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
  body: null,
  requestContext: {
    authorizer: {
      claims: undefined
    }
  }
}, action) => {
  switch (action.type) {
    case 'REQUEST_HEADER':
      return Object.assign(
        {},
        state,
        {
          headers: Object.assign({}, state.headers, {[action.name]: action.value}),
          requestContext: {
            authorizer: {
              claims: action.name === 'Authorization' ? jwt.verify(action.value.match('Bearer (.+)')[1], 'secret') : undefined
            }
          }
        }
      )
    case 'REQUEST_METHOD':
      return Object.assign({}, state, {httpMethod: action.method})
    case 'REQUEST_RESOURCE':
      return Object.assign({}, state, {
        path: action.path.split('?')[0],
        queryStringParameters: action.path.split('?')[1] || null
      })
    case 'REQUEST_BODY':
      return Object.assign({}, state, {body: JSON.stringify(action.body)})
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
      return Object.assign({}, state, {[action.key]: action.value})
    default:
      return state
  }
}

const users = {}
const userRepo = {
  users,
  getById: id => Promise.resolve(users[id])
}

const apiHandler = require('../../handler/api')
const userHandler = require('../../handler/user')
const checkingAccountHandler = require('../../handler/checkingAccount')
const spendingHandler = require('../../handler/spending')
const endpoints = [
  {path: new RegExp(`GET /api`), handler: apiHandler.api},
  {
    path: /^POST \/me$/,
    handler: userHandler.me
  },
  {
    path: /^POST \/checking-account$/,
    handler: checkingAccountHandler.create
  },
  {
    path: /^POST \/checking-account\/search$/,
    handler: checkingAccountHandler.search
  },
  {
    path: /^GET \/checking-account\/(.+)$/,
    handler: (event, context, callback) => {
      checkingAccountHandler.get(Object.assign({}, event, {pathParameters: {id: event.path.split('/').pop()}}), context, callback)
    }
  },
  {
    path: /^POST \/checking-account\/([^/]+)\/spending$/,
    handler: (event, context, callback) => {
      spendingHandler.create(Object.assign({}, event, {pathParameters: {id: event.path.split('/')[2]}}), context, callback)
    }
  },
  {
    path: /^POST \/checking-account\/([^/]+)\/spending\/search$/,
    handler: (event, context, callback) => {
      spendingHandler.search(Object.assign({}, event, {pathParameters: {id: event.path.split('/')[2]}}), context, callback)
    }
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
      store.dispatch({
        type: 'REQUEST_BODY',
        body: argument ? JSON.parse(argument) : undefined
      })

      const r = `${match[1]} ${uri.pathname}`
      const route = this.endpoints.find(({path}) => path.test(r))
      if (!route) {
        throw new Error(`No handler matches "${r}"!`)
      }

      return new Promise((resolve, reject) => {
        Promise
          .try(() => route.handler(store.getState().proxyEvent, {dynamoDB: app.dynamoDB}, (err, response) => {
            if (err) return reject(err)
            store.dispatch({type: 'RESPONSE', response})
            return resolve()
          }))
          .catch(err => {
            const m = `Executing handler ${route.handler} for ${r} failed: (${err.message}!`
            reject(new Error(m))
          })
      })
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
    const responseStringPropertyTestRx = /^"([^"]+)" should equal "([^"]+)"$/
    if (responseStringPropertyTestRx.test(step)) {
      const match = step.match(responseStringPropertyTestRx)
      return Promise.try(() => expect(store.getState().response.body).toMatchObject({[match[1]]: match[2]}))
    }

    const responseBooleanPropertyTestRx = /^"([^"]+)" should equal (true|false)$/
    if (responseBooleanPropertyTestRx.test(step)) {
      const match = step.match(responseBooleanPropertyTestRx)
      return Promise.try(() => expect(store.getState().response.body).toMatchObject({[match[1]]: match[2] === 'true'}))
    }

    const responseIntegerPropertyTestRx = /^"([^"]+)" should equal (-?[0-9]+)$/
    if (responseIntegerPropertyTestRx.test(step)) {
      const match = step.match(responseIntegerPropertyTestRx)
      return Promise.try(() => expect(store.getState().response.body).toMatchObject({[match[1]]: +match[2]}))
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

    const listResultTestRx = /a list of "([^"]+)" with ([0-9]+) of ([0-9]+) items? should be returned/
    if (listResultTestRx.test(step)) {
      const match = step.match(listResultTestRx)
      return Promise.try(() => {
        const body = store.getState().response.body
        expect(body.$context).toEqual(List.$context.toString())
        body.items.map(({$context}) => expect($context).toEqual(match[1]))
        expect(body.items).toHaveLength(+match[2])
        expect(body.total).toEqual(+match[3])
      })
    }

    const storeLinksRx = /^I store the link to "([^"]+)" as "([^"]+)"/
    if (storeLinksRx.test(step)) {
      const match = step.match(storeLinksRx)
      return Promise
        .try(() => {
          const body = store.getState().response.body
          expect(body).toHaveProperty('$links')
          const link = body.$links.find(({rel, subject}) => (/^https?:\/\//.test(match[1]) ? subject : rel) === match[1])
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

    const storePropertyOfListItemRx = /^I store "([^"]+)" of the item matching ([^ ]+):"([^"]+)" as "([^"]+)"/
    if (storePropertyOfListItemRx.test(step)) {
      const match = step.match(storePropertyOfListItemRx)
      return Promise
        .try(() => {
          const item = store.getState().response.body.items.find(item => item[match[2]] === match[3])
          expect(item).toHaveProperty(match[1])
          store.dispatch({
            type: 'STORE',
            value: item[match[1]],
            key: match[4]
          })
        })
    }

    const responseListItemPropertyRx = /^"([^"]+)" of the item matching ([^ ]+):"([^"]+)" should equal "([^"]+)"$/
    if (responseListItemPropertyRx.test(step)) {
      const match = step.match(responseListItemPropertyRx)
      return Promise
        .try(() => {
          const item = store.getState().response.body.items.find(item => item[match[2]] === match[3])
          expect(item).toHaveProperty(match[1])
          expect(item[match[1]]).toEqual(match[4])
        })
    }

    const responseListItemIntegerPropertyRx = /^"([^"]+)" of the item matching ([^ ]+):"([^"]+)" should equal (-?[0-9]+)$/
    if (responseListItemIntegerPropertyRx.test(step)) {
      const match = step.match(responseListItemIntegerPropertyRx)
      return Promise
        .try(() => {
          const item = store.getState().response.body.items.find(item => item[match[2]] === match[3])
          expect(item).toHaveProperty(match[1])
          expect(item[match[1]]).toEqual(+match[4])
        })
    }

    const responseListItemBooleanPropertyRx = /^"([^"]+)" of the item matching ([^ ]+):"([^"]+)" should equal (true|false)$/
    if (responseListItemBooleanPropertyRx.test(step)) {
      const match = step.match(responseListItemBooleanPropertyRx)
      return Promise
        .try(() => {
          const item = store.getState().response.body.items.find(item => item[match[2]] === match[3])
          expect(item).toHaveProperty(match[1])
          expect(item[match[1]]).toEqual(match[4] === 'true')
        })
    }

    const userPropertyRx = /the token for this user is stored as "([^"]+)"/
    if (userPropertyRx.test(step)) {
      const match = step.match(userPropertyRx)
      const {email, name} = JSON.parse(argument)
      const token = this.createToken(email, name)
      const sub = JSON.parse(Buffer.from(token.split('.')[1], 'base64')).sub
      userRepo.users[sub] = new User({
        $id: new URIValue(`${process.env.API_ENDPOINT}/user/${email}`),
        $version: 1,
        $createdAt: new Date(),
        email: new EmailValue(email),
        name
      })
      store.dispatch({
        type: 'STORE',
        key: match[1],
        value: token
      })
      return Promise.resolve()
    }
  }

  // Creates a token with the properties AWS cognito has
  // https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html
  createToken (email, name) {
    return jwt.sign(
      {
        email,
        email_verified: 'true',
        'cognito:username': email,
        token_use: 'id', // The intended purpose of this token. Its value is always id in the case of the ID token.
        event_id: uuid.v4(),
        auth_time: Date.now(),
        name
      },
      'secret',
      {
        algorithm: 'HS256',
        issuer: 'https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_123456abc',
        subject: Buffer.from(email).toString('base64'), //  The UUID of the authenticated user. This is not the same as username.
        audience: '123456789abcdefghijklmnopq', // Contains the client_id with which the user authenticated.
        expiresIn: '1h'
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
  .spread((dynamoDB, eventsTable, relationsTable, indexTable) => {
    process.env.TABLE_EVENTS = eventsTable
    process.env.TABLE_RELATIONS = relationsTable
    process.env.TABLE_INDEX = indexTable
    app.dynamoDB = dynamoDB
  }))

afterAll(close)
afterAll(() => {
  const {steps, response, proxyEvent} = rootStore.getState()
  if (steps.failed) {
    console.error(
      [
        chalk.red(`Failed step: ${steps.failedStep}`),
        chalk.cyan(`Request: ${proxyEvent.httpMethod} ${proxyEvent.path}\n> ${proxyEvent.body}`),
        chalk.blue(`Response: ${response.statusCode}\n${Object.keys(response.headers).map(header => `${header}: ${response.headers[header]}`).join('\n')}\n\n${JSON.stringify(response.body, null, 2)}`)
      ].join('\n')
    )
  }
})

const Gherkin = require('gherkin')
const parser = new Gherkin.Parser(new Gherkin.AstBuilder())
const matcher = new Gherkin.TokenMatcher()

const runFeatures = () => Promise
  .map(glob('./features/*.feature'), file => readFile(file))
  .map(featureData => { // Parse the feature files
    const scanner = new Gherkin.TokenScanner(featureData.toString())
    return parser.parse(scanner, matcher).feature
  })
  .then(parsedFeatures => {
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

    return Promise
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
                    const replaceArguments = str => Object.keys(dataset).reduce((str, key) => str.replace(new RegExp(`<${key}>`, 'g'), dataset[key]), str)

                    // Replace {foo} storage placeholders
                    const storage = rootStore.getState().storage
                    const replacePlaceholders = str => Object.keys(storage).reduce((str, key) => str.replace(new RegExp(`{${key}}`, 'g'), storage[key]), str)

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
                      .catch(err => {
                        rootStore.dispatch({
                          type: 'STEP_FAILED',
                          step: stepText,
                          error: err
                        })
                        return reject(err)
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
  })

describe('Features', () => {
  test('they should run', () => runFeatures()
    .then(() => {
      expect(rootStore.getState().steps.failed).toEqual(false)
    })
  )
})
