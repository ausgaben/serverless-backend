const {NonEmptyString} = require('@rheactorjs/event-store-dynamodb')
const t = require('tcomb')

class AggregateSortIndex {
  /**
   * Manages indices for aggregates
   *
   * @param {String} aggregateName
   * @param {DynamoDB} dynamoDB
   * @param {String} tableName
   */
  constructor (aggregateName, dynamoDB, tableName = 'indexes') {
    this.aggregateName = NonEmptyString(aggregateName, ['AggregateSortIndex()', 'aggregateName:string'])
    this.dynamoDB = t.Object(dynamoDB, ['AggregateSortIndex()', 'dynamoDB:Object'])
    this.tableName = NonEmptyString(tableName, ['AggregateSortIndex()', 'tableName:String'])
  }

  /**
   * Add the aggregateId for the given key to the index
   *
   * @param {String} indexName
   * @param {String} aggregateId
   * @param {String} key
   * @returns {Promise}
   */
  add (indexName, aggregateId, key) {
    NonEmptyString(indexName, ['AggregateSortIndex.add()', 'indexName:String'])
    NonEmptyString(aggregateId, ['AggregateSortIndex.add()', 'aggregateId:String'])
    NonEmptyString(key, ['AggregateSortIndex.add()', 'key:String'])
    return this.dynamoDB
      .updateItem({
        TableName: this.tableName,
        Key: {
          AggregateIndexName: {
            S: `${this.aggregateName}.${indexName}`
          },
          IndexKey: {
            S: key
          }
        },
        UpdateExpression: 'ADD AggregateIds :AggregateId',
        ExpressionAttributeValues: {
          ':AggregateId': {SS: [aggregateId]}
        }
      })
      .promise()
  }

  /**
   * Remove the aggregateId for the given key from index
   *
   * @param {String} indexName
   * @param {String} aggregateId
   * @returns {Promise}
   */
  remove (indexName, aggregateId) {
    NonEmptyString(indexName, ['AggregateSortIndex.remove()', 'indexName:String'])
    NonEmptyString(aggregateId, ['AggregateSortIndex.remove()', 'aggregateId:String'])

    return this.dynamoDB
      .query({
        TableName: this.tableName,
        KeyConditionExpression: 'AggregateIndexName = :AggregateIndexName AND IndexKey > :IndexKey',
        FilterExpression: 'contains(AggregateIds, :AggregateId)',
        ExpressionAttributeValues: {
          ':AggregateIndexName': {S: `${this.aggregateName}.${indexName}`},
          ':IndexKey': {S: Buffer.from('\0', 'ascii').toString()},
          ':AggregateId': {S: aggregateId}
        }
      })
      .promise()
      .then(({Items}) => {
        if (Items) {
          return Promise.all(Items.map(({AggregateIndexName, IndexKey}) => this.dynamoDB
            .updateItem({
              TableName: this.tableName,
              Key: {
                AggregateIndexName,
                IndexKey
              },
              UpdateExpression: 'DELETE AggregateIds :AggregateId',
              ExpressionAttributeValues: {
                ':AggregateId': {SS: [aggregateId]}
              }
            })
            .promise()))
        }
      })
  }

  /**
   * Find the aggregateIds in the given range
   *
   * @param {String} indexName
   * @param {String} from
   * @param {String} to
   * @returns {Promise}
   */
  find (indexName, from, to) {
    NonEmptyString(indexName, ['AggregateSortIndex.find()', 'indexName:String'])
    NonEmptyString(from, ['AggregateSortIndex.find()', 'from:String'])
    t.maybe(NonEmptyString)(to, ['AggregateSortIndex.find()', 'to:?String'])
    const q = {
      TableName: this.tableName,
      KeyConditionExpression: 'AggregateIndexName = :AggregateIndexName AND IndexKey >= :from',
      ExpressionAttributeValues: {
        ':AggregateIndexName': {S: `${this.aggregateName}.${indexName}`},
        ':from': {S: from}
      }
    }
    if (to) {
      q.KeyConditionExpression = 'AggregateIndexName = :AggregateIndexName AND IndexKey BETWEEN :from AND :to'
      q.ExpressionAttributeValues[':to'] = {S: to}
    }
    return this.dynamoDB
      .query(q)
      .promise()
      .then(({Items}) => {
        const idx = (Items || []).reduce((idx, {AggregateIds: {SS}, IndexKey: {S}}) => {
          SS.forEach(id => {
            idx[id] = S
          })
          return idx
        }, {})
        const idSets = (Items || []).map(({AggregateIds}) => AggregateIds.SS)
        const flattened = idSets.reduce((idSets, ids) => idSets.concat(ids), [])
        return flattened.sort((id1, id2) => idx[id1] > idx[id2] ? 1 : -1)
      })
  }

  /**
   * Add the given item to the index
   *
   * @param {String} indexName
   * @param {String} item
   * @returns {Promise}
   */
  addToList (indexName, item) {
    NonEmptyString(indexName, ['AggregateSortIndex.add()', 'indexName:String'])
    NonEmptyString(item, ['AggregateSortIndex.add()', 'item:String'])
    return this.dynamoDB
      .updateItem({
        TableName: this.tableName,
        Key: {
          AggregateIndexName: {
            S: `${this.aggregateName}.${indexName}`
          },
          IndexKey: {
            S: item
          }
        }
      })
      .promise()
  }

  /**
   * Removes the given key from the index
   *
   * @param {String} indexName
   * @param {String} item
   * @returns {Promise}
   */
  removeFromList (indexName, item) {
    NonEmptyString(indexName, ['AggregateSortIndex.add()', 'indexName:String'])
    NonEmptyString(item, ['AggregateSortIndex.add()', 'item:String'])
    return this.dynamoDB
      .deleteItem({
        TableName: this.tableName,
        Key: {
          AggregateIndexName: {
            S: `${this.aggregateName}.${indexName}`
          },
          IndexKey: {
            S: item
          }
        }
      })
      .promise()
  }

  /**
   * Find the keys in the given list
   *
   * @param {String} indexName
   * @param {String} from
   * @param {String} to
   * @returns {Promise}
   */
  findListItems (indexName, from, to) {
    NonEmptyString(indexName, ['AggregateSortIndex.find()', 'indexName:String'])
    NonEmptyString(from, ['AggregateSortIndex.find()', 'from:String'])
    t.maybe(NonEmptyString)(to, ['AggregateSortIndex.find()', 'to:?String'])
    const q = {
      TableName: this.tableName,
      KeyConditionExpression: 'AggregateIndexName = :AggregateIndexName AND IndexKey >= :from',
      ExpressionAttributeValues: {
        ':AggregateIndexName': {S: `${this.aggregateName}.${indexName}`},
        ':from': {S: from}
      }
    }
    if (to) {
      q.KeyConditionExpression = 'AggregateIndexName = :AggregateIndexName AND IndexKey BETWEEN :from AND :to'
      q.ExpressionAttributeValues[':to'] = {S: to}
    }
    return this.dynamoDB
      .query(q)
      .promise()
      .then(({Items}) => (Items || []).map(({IndexKey: {S}}) => S))
  }
}

module.exports = {AggregateSortIndex}
