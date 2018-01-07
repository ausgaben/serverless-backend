'use strict'

const {AggregateRelation, EventStore} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountRepository} = require('../repository/checking-account')
const {SpendingRepository} = require('../repository/spending')
const {AggregateSortIndex} = require('../repository/aggregate-sort-index')
const {AccessDeniedError} = require('@rheactorjs/errors')

/**
 * Creates a new CheckingAccount service
 *
 * @param {EventStore} eventStore
 * @constructor
 */
class CheckingAccountService {
  constructor (dynamoDB, eventsTable, relationsTable, indexTable) {
    this.checkingAccountRepo = new CheckingAccountRepository(
      new EventStore('CheckingAccount', dynamoDB, eventsTable),
      new AggregateRelation('CheckingAccount', dynamoDB, relationsTable)
    )
    this.spendingRepo = new SpendingRepository(
      new EventStore('Spending', dynamoDB, eventsTable),
      new AggregateRelation('Spending', dynamoDB, relationsTable),
      new AggregateSortIndex('Spending', dynamoDB, indexTable)
    )
  }

  create (name, user) {
    return this.checkingAccountRepo.add({name, users: [user]})
      .then(() => undefined)
  }

  find (user, query = '', pagination) {
    const parsedQuery = parseQuery(query)
    return this.checkingAccountRepo.findIdsByUser(user)
      .then(userAccountIds => {
        if (parsedQuery.id) {
          if (userAccountIds.indexIf(parsedQuery.id) === -1) {
            throw new AccessDeniedError(`User "${user}" is not allowed to access Checking Account "${parsedQuery.id}"!`)
          }
          userAccountIds = userAccountIds.filter(id => id === parsedQuery.id)
        }
        const total = userAccountIds.length
        return Promise
          .all(pagination.splice(userAccountIds).map(id => this.checkingAccountRepo.getById(id)))
          .then(items => pagination.result(items, total, query))
      })
  }

  getById (user, id) {
    return this.checkingAccountRepo.getById(id)
      .then(checkingAccount => {
        if (checkingAccount.users.indexOf(user) === -1) {
          throw new AccessDeniedError(`User "${user}" is not allowed to access checking account "${checkingAccount.meta.id}"!`)
        }
        return checkingAccount
      })
  }

  createSpending (user, checkingAccountId, category, title, amount, booked = false, bookedAt, saving = false) {
    return this.getById(user, checkingAccountId)
      .then(() => this.spendingRepo.add({
        checkingAccount: checkingAccountId, category, title, amount, booked, bookedAt, saving
      }))
      .then(() => undefined)
  }

  updateSpending (user, id, category, title, amount, booked, bookedAt, saving) {
    return this.getSpendingById(user, id)
      .then(spending => this.spendingRepo.update(spending, {
        category,
        title,
        amount,
        booked,
        bookedAt,
        saving
      }))
      .then(() => undefined)
  }

  findSpendings (user, checkingAccountId, query = '', pagination) {
    const p = parseQuery(query)
    return this.spendingRepo.findIdsByCheckingAccountId(checkingAccountId, {from: p.tokens.from, to: p.tokens.to})
      .then(spendingIds => {
        const total = spendingIds.length
        return Promise.all(pagination.splice(spendingIds).map(id => this.spendingRepo.getById(id)))
          .then(items => pagination.result(items, total))
      })
  }

  getSpendingById (user, id) {
    return this.spendingRepo.getById(id)
      .then(spending => this.getById(user, spending.checkingAccount)
        .then(() => spending)
      )
  }

  deleteSpendingById (user, id) {
    return this.getSpendingById(user, id)
      .then(spending => this.spendingRepo.delete(spending))
      .then(() => undefined)
  }
}

const parseQuery = str => {
  const tokens = (str.match(/[a-z-]+:("[^"]+"|[^ ]+)/g, str) || []).reduce((tokens, token) => {
    const p = token.indexOf(':')
    const k = token.substr(0, p)
    tokens[k] = token.substr(p + 1)
    return tokens
  }, {})
  return {
    tokens,
    text: Object.keys(tokens).reduce((str, token) => str.replace(`${token}:${tokens[token]}`, ''), str).trim()
  }
}

module.exports = {CheckingAccountService}
