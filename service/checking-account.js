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

  async create (name, user) {
    await this.checkingAccountRepo.add({name, user})
  }

  async find (user, query = '', pagination) {
    const parsedQuery = parseQuery(query)
    let userAccountIds = await this.checkingAccountRepo.findIdsByUser(user)
    if (parsedQuery.id) {
      if (userAccountIds.indexIf(parsedQuery.id) === -1) {
        throw new AccessDeniedError(`User "${user}" is not allowed to access Checking Account "${parsedQuery.id}"!`)
      }
      userAccountIds = userAccountIds.filter(id => id === parsedQuery.id)
    }
    const total = userAccountIds.length
    const items = await Promise.all(pagination.splice(userAccountIds).map(id => this.checkingAccountRepo.getById(id)))
    return pagination.result(items, total, query)
  }

  async getById (user, id) {
    const checkingAccount = await this.checkingAccountRepo.getById(id)
    if (checkingAccount.users.indexOf(user) === -1) {
      throw new AccessDeniedError(`User "${user}" is not allowed to access checking account "${checkingAccount.meta.id}"!`)
    }
    return checkingAccount
  }

  async createSpending (user, checkingAccountId, category, title, amount, booked = false, bookedAt, saving = false) {
    const sig = ['CheckingAccountService', 'createSpending()']
    const checkingAccount = await this.getById(user, checkingAccountId)
    await this.spendingRepo.add({
      checkingAccount: checkingAccount.meta.id,
      category: NonEmptyString(category, sig.concat('category:String')),
      title: NonEmptyString(title, sig.concat('title:String')),
      amount: t.Integer(amount, sig.concat('amount:Integer')),
      booked: t.Boolean(booked, sig.concat('booked:Boolean')),
      bookedAt: t.maybe(t.Date)(bookedAt, sig.concat('bookedAt:?Date')),
      saving: t.Boolean(saving, sig.concat('saving:Boolean')),
      author: user
    })
  }

  async findSpendings (user, checkingAccountId, pagination) {
    let spendingIds = await this.spendingRepo.findIdsByCheckingAccountId(checkingAccountId)
    const total = spendingIds.length
    const items = await Promise.all(pagination.splice(spendingIds).map(id => this.spendingRepo.getById(id)))
    return pagination.result(items, total)
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
