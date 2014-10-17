q = require 'q'
moddl = require 'moddl'
require('moddl-mongodb')(moddl)

{EventEmitter} = require 'events'

OP_NAMES =
  i: 'INSERT'
  u: 'UPDATE'
  d: 'DELETE'
  c: 'COMMAND'
  db: 'DATABASE'
  n: 'NOOP'

class Tails extends EventEmitter
  constructor: (@conn_opts, @opts = {}) ->
    @__defineGetter__ 'dbName', -> @connection?.databaseName
    @__defineGetter__ 'lastTimestamp', -> @_last_timestamp
    @__defineSetter__ 'lastTimestamp', (v) -> @_last_timestamp = v
  
  connect: ->
    return @_connection if @_connection?
    
    moddl.Model.connect(mongodb: @conn_opts.url)
    @_connection = moddl.Model.Mongodb.provider.get_database('DEFAULT')
    .then (@connection) =>
      db = @connection.db('local')
      @collection = db.collection('oplog.rs')
  
  start: ->
    @connect().then =>
      @loop()
  
  loop: ->
    make_pass = =>
      @single_pass()
        .then(q.delay(2500))
        .then(make_pass)
    
    make_pass()
  
  single_pass: ->
    @last_timestamp().then (ts) =>
      cursor = @collection.find({ts: {$gt: ts}}, tailable: true)
      @iterate_cursor(cursor)
  
  iterate_cursor: (cursor) ->
    d = q.defer()
    
    cursor.each (err, item) =>
      return d.reject(err) if err?
      return d.resolve() unless item?
      
      [_x, db, col] = /^([^\.]+)\.(.+)$/.exec(item.ns) if item.ns
      
      return unless db is @dbName
      
      op =
        ts: new Date(1000 * item.ts.high_)
        id: item.h.toNumber()
        database: db
        collection: col
        type: item.op
        name: OP_NAMES[item.op]
      
      if item.op is 'u'
        op.query = item.o2
        op.update = item.o
      else if item.op in ['i', 'd', 'c', 'db']
        op.document = item.o
      
      try
        @emit('operation', op)
        @lastTimestamp = item.ts if item.ts > @lastTimestamp
      catch err
        cursor.close()
        d.reject(err)
    
    d.promise
  
  last_timestamp: ->
    # return last if we already have it
    return q(@lastTimestamp) if @lastTimestamp?
  
    # get first ts
    q.ninvoke(@collection.find().sort($natural: 1).limit(1), 'nextObject')
    .then (doc) ->
      doc.ts

exports.Tails = Tails
exports.tail = (conn_url) -> new Tails(url: conn_url)
