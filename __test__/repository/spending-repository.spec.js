/* global describe expect it beforeAll afterAll */

const {SpendingRepository} = require('../../repository/spending')
const Promise = require('bluebird')
const {EventStore, AggregateRelation, ModelEvent} = require('@rheactorjs/event-store-dynamodb')
const {dynamoDB, close} = require('@rheactorjs/event-store-dynamodb/test/helper')

describe('SpendingRepository', () => {
  let spendingRepo

  beforeAll(() => dynamoDB()
    .spread((dynamoDB, eventsTable, relationsTable) => {
      spendingRepo = new SpendingRepository(
        new EventStore('Spending', dynamoDB, eventsTable),
        new AggregateRelation('Spending', dynamoDB, relationsTable)
      )
    }))

  afterAll(close)

  it('should persist', (done) => {
    Promise
      .join(
        spendingRepo.add({
          checkingAccount: '42',
          author: '17',
          category: 'Salary',
          title: 'Tanja\'s Salary',
          amount: 165432,
          booked: true,
          bookedAt: new Date('2015-01-01')
        }),
        spendingRepo.add({
          checkingAccount: '42',
          author: '17',
          category: 'Salary',
          title: 'Markus\'s Salary',
          amount: 123456,
          booked: true,
          bookedAt: new Date('2015-01-02')
        })
      )
      .spread((event1, event2) => {
        expect(event1).toBeInstanceOf(ModelEvent)
        expect(event2).toBeInstanceOf(ModelEvent)
        return Promise
          .join(
            spendingRepo.getById(event1.aggregateId),
            spendingRepo.getById(event2.aggregateId)
          )
          .spread((s1, s2) => {
            expect(s1.checkingAccount).toEqual('42')
            expect(s1.author).toEqual('17')
            expect(s1.category).toEqual('Salary')
            expect(s1.title).toEqual('Tanja\'s Salary')
            expect(s1.amount).toEqual(165432)
            expect(s1.bookedAt.getTime()).toEqual(new Date('2015-01-01').getTime())
            expect(s1.booked).toEqual(true)
            expect(s2.checkingAccount).toEqual('42')
            expect(s2.author).toEqual('17')
            expect(s2.category).toEqual('Salary')
            expect(s2.title).toEqual('Markus\'s Salary')
            expect(s2.amount).toEqual(123456)
            expect(s2.bookedAt.getTime()).toEqual(new Date('2015-01-02').getTime())
            expect(s2.booked).toEqual(true)
            done()
          })
      })
  })
})
