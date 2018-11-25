'use strict'

const fs = require('fs').promises
const path = require('path')
const os = require('os')
const { S3, DynamoDB } = require('aws-sdk')
const { Ausgaben } = require('../service/ausgaben')
const { Pagination } = require('@rheactorjs/event-store-dynamodb')
const Promise = require('bluebird')

const s3 = new S3()
const db = new DynamoDB()

const Bucket = 'ausgaben-import-hostedinspace'
const Stack = 'ausgaben-dev'
const userId = 'db1fec08-e071-4ae7-b7a2-2f71f26f460c'

const ausgaben = new Ausgaben(
  db,
  `${Stack}-events`,
  `${Stack}-index`
)

const fetchAndCache = async (filename) => {
  const cache = path.resolve(os.tmpdir(), filename)
  try {
    const data = await fs.readFile(cache, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    if (e.code === 'ENOENT') {
      const { Body } = await s3.getObject({
        Bucket,
        Key: filename
      }).promise()
      await fs.writeFile(cache, Body, 'utf-8')
      return JSON.parse(Body)
    }
    throw e
  }
}

const paginate = async (
  paginator,
  onItems,
  offset = 0
) => {
  const page = await paginator(offset)
  await onItems(page.items)
  if (page.nextOffset) {
    await paginate(paginator, onItems, page.nextOffset)
  }
};

(async () => {
  const importId = `${Math.random().toString(36).replace(/[^a-z]+/g, '')}@${new Date().toISOString().substr(0, 10)}`
  const [accounts, spendings] = await Promise.all([
    fetchAndCache('accounts.json'),
    fetchAndCache('spendings.json')
  ]
  )

  await Promise.map(
    accounts,
    async ({ id, name }) => {
      const accountSpendings = spendings.filter(({ checkingAccount }) => checkingAccount === id)
      const accountName = `${name} [${importId}]`
      console.log(accountName)
      await ausgaben.create(accountName, userId)
      await paginate(
        offset => ausgaben.find(userId, '', new Pagination(offset)),
        async items => {
          const account = items.find(({ name }) => name === accountName)
          if (account) {
            console.log(`${accountSpendings.length} spendings`)
            await Promise.map(
              accountSpendings,
              ({ category, title, amount, booked = false, bookedAt, saving = false }) => ausgaben.createSpending(
                userId,
                account.meta.id, category, title, amount, booked, bookedAt ? new Date(bookedAt) : undefined, saving
              ),
              { concurrency: 1 }
            )
          }
        }
      )
    },
    { concurrency: 1 }
  )
})()
