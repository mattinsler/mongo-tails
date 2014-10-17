mongo_url = 'mongodb://localhost:27017/db-name'

tails = require('../lib/mongo-tails').tail(url: mongo_url)

tails.on 'operation', (op) ->
  return unless collection_actions[op.collection]?
  
  collection_actions[op.collection](op)

collection_actions =
  entries: (op) ->
    switch op.name
      when 'INSERT' then console.log '[Entry] New    :', op.document._id
      when 'UPDATE' then console.log '[Entry] Updated:', op.query

tails.start()
.catch (err) ->
  console.log err.stack
