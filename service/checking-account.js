'use strict'

const {NonEmptyString, AggregateRelation, EventStore} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountRepository} = require('../repository/checking-account')

/**
 * Creates a new CheckingAccount service
 *
 * @param {EventStore} eventStore
 * @constructor
 */
class CheckingAccountService {
  constructor (dynamoDB, eventsTable, relationsTable, indexTable) {
    this.checkingAccountRepo = new CheckingAccountRepository(
      new EventStore('CheckingAccount', dynamoDB, eventsTable)
    )
    this.checkingAccountRelation = new AggregateRelation('checking-account', dynamoDB, relationsTable)
  }

  async create (name, author) {
    const event = await this.checkingAccountRepo.add({
      name: NonEmptyString(name, ['CheckingAccountService', 'create()', 'name:string']),
      users: [NonEmptyString(author, ['CheckingAccountService', 'create()', 'author:string'])]
    })
    await this.checkingAccountRelation.addRelatedId('user', author, event.aggregateId)
  }

  async findByUser (user, query = '', pagination) {
    const parsedQuery = parseQuery(query)
    let userAccountIds = await this.checkingAccountRelation.findByRelatedId('user', user)
    if (parsedQuery.id) {
      userAccountIds = userAccountIds.filter(id => id === parsedQuery.id)
    }
    const total = userAccountIds.length
    const items = await Promise.all(pagination.splice(userAccountIds).map(id => this.checkingAccountRepo.getById(id)))
    return pagination.result(items, total, query)
  }
}

const parseQuery = str => {
  const tokens = (str.match(/[a-z-]+:("[^"]+"|[^ ]+)/g, str) || []).reduce((tokens, token) => {
    const [k, v] = token.split(':', 2)
    tokens[k] = v
    return tokens
  }, {})
  return {
    tokens,
    text: Object.keys(tokens).reduce((str, token) => str.replace(`${token}:${tokens[token]}`, ''), str)
  }
}

module.exports = {CheckingAccountService}
