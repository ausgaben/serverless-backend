'use strict'

const {NonEmptyString, AggregateRelation, EventStore} = require('@rheactorjs/event-store-dynamodb')
const {CheckingAccountRepository} = require('../repository/checking-account')
const {SpendingRepository} = require('../repository/spending')
const {AccessDeniedError} = require('@rheactorjs/errors')
const t = require('tcomb')

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
      new AggregateRelation('Spending', dynamoDB, relationsTable)
    )
  }

  create (name, user) {
    return this.checkingAccountRepo.add({name, user})
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
    const sig = ['CheckingAccountService', 'createSpending()']
    return this.getById(user, checkingAccountId)
      .then(checkingAccount => this.spendingRepo.add({
        checkingAccount: checkingAccount.meta.id,
        category: NonEmptyString(category, sig.concat('category:String')),
        title: NonEmptyString(title, sig.concat('title:String')),
        amount: t.Integer(amount, sig.concat('amount:Integer')),
        booked: t.Boolean(booked, sig.concat('booked:Boolean')),
        bookedAt: t.maybe(t.Date)(bookedAt, sig.concat('bookedAt:?Date')),
        saving: t.Boolean(saving, sig.concat('saving:Boolean')),
        author: user
      }))
      .then(() => undefined)
  }

  findSpendings (user, checkingAccountId, pagination) {
    return this.spendingRepo.findIdsByCheckingAccountId(checkingAccountId)
      .then(spendingIds => {
        const total = spendingIds.length
        return Promise.all(pagination.splice(spendingIds).map(id => this.spendingRepo.getById(id)))
          .then(items => pagination.result(items, total))
      })
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
