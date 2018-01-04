/* global describe expect it beforeAll afterAll */

const {CheckingAccountRepository} = require('../../repository/checking-account')
const Promise = require('bluebird')
const {ModelEvent, EventStore} = require('@rheactorjs/event-store-dynamodb')
const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')

describe('CheckingAccountRepository', () => {
  let checkingAccountRepo

  beforeAll(() => dynamoDB()
    .spread((dynamoDB, eventsTable) => {
      checkingAccountRepo = new CheckingAccountRepository(
        new EventStore('CheckingAccount', dynamoDB, eventsTable)
      )
    }))

  afterAll(close)

  it('should persist', (done) => {
    Promise
      .join(
        checkingAccountRepo.add({name: 'CheckingAccount 1'}),
        checkingAccountRepo.add({name: 'CheckingAccount 2'})
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
            expect(a2.name).toEqual('CheckingAccount 2')
            done()
          })
      })
  })
})
