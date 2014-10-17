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

tails.on('item', function(item) {
  console.log(item.id, item.opName);
});

tails.start();
```

## License
Copyright (c) 2014 Matt Insler  
Licensed under the MIT license.
