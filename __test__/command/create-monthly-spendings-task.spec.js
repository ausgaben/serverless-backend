/* global describe expect it afterAll beforeAll */

const {CreateMonthlySpendingsCommand} = require('../../command/create-monthly-spendings')
const {PeriodicalRepository} = require('../../repository/periodical')
const {SpendingRepository} = require('../../repository/spending')
const {AggregateSortIndex} = require('../../repository/aggregate-sort-index')
const {PeriodicalModel} = require('../../model/periodical')
const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')
const {EventStore, AggregateRelation} = require('@rheactorjs/event-store-dynamodb')
const Promise = require('bluebird')

const {AggregateMeta} = require('@rheactorjs/event-store-dynamodb')

describe('CreateMonthlySpendingsCommand', () => {
  let task

  let periodicalRepo, spendingRepo

  beforeAll(() => dynamoDB()
    .spread((dynamoDB, eventsTable, indexTable) => {
      periodicalRepo = new PeriodicalRepository(
        new EventStore('Periodical', dynamoDB, eventsTable),
        new AggregateRelation('Periodical', dynamoDB, indexTable)
      )
      spendingRepo = new SpendingRepository(
        new EventStore('Spending', dynamoDB, eventsTable),
        new AggregateRelation('Spending', dynamoDB, indexTable),
        new AggregateSortIndex('Spending', dynamoDB, indexTable)
      )
    }))

  afterAll(close)

  let periodical1 = new PeriodicalModel(
    '4242',
    'Salary',
    'Tanja\'s Salary',
    165432,
    false,
    new Date('2015-01-01'),
    undefined,
    new AggregateMeta('1', 1)
  )

  let periodical2 = new PeriodicalModel(
    '4242',
    'Salary',
    'Markus\'s Salary',
    123456,
    false,
    new Date('2015-01-02'),
    undefined,
    new AggregateMeta('1', 1)
  )

  it('should create spendings for the given month', done => {
    let periodicals = [periodical1, periodical2]
    let month = new Date()

    task = new CreateMonthlySpendingsCommand(periodicalRepo, spendingRepo)

    Promise
      .map(periodicals, (periodical) => periodicalRepo.add(periodical))
      .then(() => task.execute(month))
      .then(() => spendingRepo.findIdsByCheckingAccountId('4242'))
      .then(spendings => {
        expect(spendings).toHaveLength(2)
        done()
      })
  })
})
