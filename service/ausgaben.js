'use strict'

const { AggregateRelation, EventStore } = require('@rheactorjs/event-store-dynamodb')
const { CheckingAccountRepository } = require('../repository/checking-account')
const { SpendingRepository } = require('../repository/spending')
const { PeriodicalRepository } = require('../repository/periodical')
const { AggregateSortIndex } = require('../repository/aggregate-sort-index')
const { AccessDeniedError, ConflictError } = require('@rheactorjs/errors')
const { ReportModel } = require('../model/report')
const AWS = require('aws-sdk')
const Promise = require('bluebird')
AWS.config.setPromisesDependency(Promise)

class Ausgaben {
  constructor (dynamoDB, eventsTable, indexTable) {
    this.checkingAccountRepo = new CheckingAccountRepository(
      new EventStore('CheckingAccount', dynamoDB, eventsTable),
      new AggregateRelation('CheckingAccount', dynamoDB, indexTable),
      new AggregateSortIndex('CheckingAccount', dynamoDB, indexTable)
    )
    this.spendingRepo = new SpendingRepository(
      new EventStore('Spending', dynamoDB, eventsTable),
      new AggregateRelation('Spending', dynamoDB, indexTable),
      new AggregateSortIndex('Spending', dynamoDB, indexTable)
    )
    this.periodicalRepo = new PeriodicalRepository(
      new EventStore('Periodical', dynamoDB, eventsTable),
      new AggregateRelation('Periodical', dynamoDB, indexTable)
    )
  }

  create (name, user) {
    return this.checkingAccountRepo.add({ name, users: [user] })
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

  update (user, id, version, property, value) {
    return this.getById(user, id)
      .then(checkVersion(version))
      .then(checkingAccount => this.checkingAccountRepo.update(checkingAccount, { [property]: value }))
      .then(() => undefined)
  }

  createSpending (user, checkingAccountId, category, title, amount, booked = false, bookedAt, saving = false) {
    return this.getById(user, checkingAccountId)
      .then(() => this.spendingRepo.add({
        checkingAccount: checkingAccountId,
        category,
        title,
        amount,
        booked,
        bookedAt,
        saving
      }))
      .then(event => this.indexSpending(event.aggregateId))
      .then(() => undefined)
  }

  updateSpending (user, id, version, category, title, amount, booked, bookedAt, saving) {
    return this.getSpendingById(user, id)
      .then(checkVersion(version))
      .then(spending => this.spendingRepo.update(spending, {
        category,
        title,
        amount,
        booked,
        bookedAt,
        saving
      }))
      .then(event => this.indexSpending(event.aggregateId))
      .then(() => undefined)
  }

  findSpendings (user, checkingAccountId, query = '', pagination) {
    const p = parseQuery(query)
    return this.spendingRepo.findIdsByCheckingAccountId(checkingAccountId, { from: p.tokens.from, to: p.tokens.to })
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

  getReport (user, id, query = '') {
    const p = parseQuery(query)
    return this.getById(user, id)
      .then(checkingAccount => this.spendingRepo.findIdsByCheckingAccountId(checkingAccount.meta.id, {
        from: p.tokens.from,
        to: p.tokens.to
      })
        .map(id => this.spendingRepo.getById(id))
        .filter(({ booked }) => booked)
        .reduce((report, spending) => {
          report.balance += spending.amount
          if (spending.amount >= 0) {
            report.income += spending.amount
          } else {
            if (spending.saving) {
              report.savings += spending.amount
            } else {
              report.spendings += spending.amount
            }
          }
          return report
        }, new ReportModel(checkingAccount.meta.id))
      )
  }

  searchTitles (user, id, query = '', pagination) {
    const q = parseQuery(query)
    return this.getById(user, id)
      .then(checkingAccount => {
        const type = q.tokens.in === 'category' ? 'category' : 'title'
        let index = `checkingAccount:${checkingAccount.meta.id}:${type}`
        if (type === 'title') {
          index = `${index}:category:${q.tokens.category}`
        }
        return this.checkingAccountRepo.sortIndex.findListItems(index, q.text, `${q.text}\uFFFF`)
      })
      .then(strings => {
        const total = strings.length
        return pagination.result(pagination.splice(strings.map(title => ({ title }))), total, query)
      })
  }

  indexSpending (id) {
    return this.spendingRepo.getById(id)
      .then(spending => Promise.all([
        this.checkingAccountRepo.sortIndex.addToList(`checkingAccount:${spending.checkingAccount}:title:category:${spending.category}`, spending.title),
        this.checkingAccountRepo.sortIndex.addToList(`checkingAccount:${spending.checkingAccount}:category`, spending.category)
      ]))
  }

  createPeriodical (user,
    checkingAccountId,
    category,
    title,
    amount,
    estimate = false,
    startsAt,
    saving = false,
    enabledIn01 = false,
    enabledIn02 = false,
    enabledIn03 = false,
    enabledIn04 = false,
    enabledIn05 = false,
    enabledIn06 = false,
    enabledIn07 = false,
    enabledIn08 = false,
    enabledIn09 = false,
    enabledIn10 = false,
    enabledIn11 = false,
    enabledIn12 = false) {
    return this.getById(user, checkingAccountId)
      .then(() => this.periodicalRepo.add({
        checkingAccount: checkingAccountId,
        category,
        title,
        amount,
        estimate,
        startsAt,
        saving,
        enabledIn01,
        enabledIn02,
        enabledIn03,
        enabledIn04,
        enabledIn05,
        enabledIn06,
        enabledIn07,
        enabledIn08,
        enabledIn09,
        enabledIn10,
        enabledIn11,
        enabledIn12
      }))
      .then(() => undefined)
  }

  findPeriodicals (user, checkingAccountId, pagination) {
    return this.periodicalRepo.findIdsByCheckingAccountId(checkingAccountId)
      .then(periodicalIds => {
        const total = periodicalIds.length
        return Promise.all(pagination.splice(periodicalIds).map(id => this.periodicalRepo.getById(id)))
          .then(items => pagination.result(items, total))
      })
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

const checkVersion = theirVersion => aggregate => {
  if (aggregate.meta.version !== theirVersion) {
    throw new ConflictError(`${aggregate.constructor.name} "${aggregate.meta.id}" has been modified. Your version is ${theirVersion} our version is ${aggregate.meta.version}`)
  }
  return aggregate
}

module.exports = { Ausgaben }
