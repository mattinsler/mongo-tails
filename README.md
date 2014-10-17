# mongo-tails

Utility to help tailing and filtering the MongoDB Oplog

## Installation
```
npm install mongo-tails
```

## Usage

```javascript
var tails = require('mongo-tails').tail('mongodb://db-host:27017/db-name');

tails.filters.push(function(item) {
  return item.collection === 'users';
});

tails.on('operation', function(item) {
  console.log(item.id, item.opName);
});

tails.start();
```

### Operation Schema

```json
{
  "ts": Date,
  "id": 123456,
  "database": "db-name",
  "collection": "my-collection",
  "type": "i",
  "name": "INSERT",
  
  "document": {},  // for INSERT, DELETE, COMMAND, DATABASE, NOOP
  
  "query": {},     // for UPDATE
  "update": {}     // for UPDATE
}
```

### Operation Types/Names

- i: INSERT
- u: UPDATE
- d: DELETE
- c: COMMAND
- db: DATABASE
- n: NOOP

## License
Copyright (c) 2014 Matt Insler  
Licensed under the MIT license.
