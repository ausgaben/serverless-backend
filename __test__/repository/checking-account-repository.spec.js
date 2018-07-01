/* global describe expect it beforeAll afterAll */

const {CheckingAccountRepository} = require('../../repository/checking-account')
const Promise = require('bluebird')
const {ModelEvent, AggregateRelation, EventStore} = require('@rheactorjs/event-store-dynamodb')
const {AggregateSortIndex} = require('../../repository/aggregate-sort-index')
const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')

describe('CheckingAccountRepository', () => {
  let checkingAccountRepo

  beforeAll(() => dynamoDB()
    .spread((dynamoDB, eventsTable, indexTable) => {
      checkingAccountRepo = new CheckingAccountRepository(
        new EventStore('CheckingAccount', dynamoDB, eventsTable),
        new AggregateRelation('CheckingAccount', dynamoDB, indexTable),
        new AggregateSortIndex('CheckingAccount', dynamoDB, indexTable)
      )
    }))

  afterAll(async () => { await close() })

  it('should persist', (done) => {
    Promise
      .join(
        checkingAccountRepo.add({name: 'CheckingAccount 1', users: ['foo']}),
        checkingAccountRepo.add({name: 'CheckingAccount 2', users: ['bar']})
      )
      .spread((event1, event2) => {
        expect(event1).toBeInstanceOf(ModelEvent)
        expect(event2).toBeInstanceOf(ModelEvent)
        return Promise
          .join(
            checkingAccountRepo.getById(event1.aggregateId),
            checkingAccountRepo.getById(event2.aggregateId)
          )
          .spread((a1, a2) => {
            expect(a1.name).toEqual('CheckingAccount 1')
            expect(a1.currency).toEqual('€')
            expect(a1.users).toEqual(['foo'])
            expect(a2.name).toEqual('CheckingAccount 2')
            expect(a2.currency).toEqual('€')
            expect(a2.users).toEqual(['bar'])
            done()
          })
      })
  })
})
