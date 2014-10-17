(function() {
  var EventEmitter, OP_NAMES, Tails, moddl, q,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  q = require('q');

  moddl = require('moddl');

  require('moddl-mongodb')(moddl);

  EventEmitter = require('events').EventEmitter;

  OP_NAMES = {
    i: 'INSERT',
    u: 'UPDATE',
    d: 'DELETE',
    c: 'COMMAND',
    db: 'DATABASE',
    n: 'NOOP'
  };

  Tails = (function(_super) {
    __extends(Tails, _super);

    function Tails(conn_opts, opts) {
      this.conn_opts = conn_opts;
      this.opts = opts != null ? opts : {};
      this.__defineGetter__('dbName', function() {
        var _ref;
        return (_ref = this.connection) != null ? _ref.databaseName : void 0;
      });
      this.__defineGetter__('lastTimestamp', function() {
        return this._last_timestamp;
      });
      this.__defineSetter__('lastTimestamp', function(v) {
        return this._last_timestamp = v;
      });
    }

    Tails.prototype.connect = function() {
      var _this = this;
      if (this._connection != null) {
        return this._connection;
      }
      moddl.Model.connect({
        mongodb: this.conn_opts.url
      });
      return this._connection = moddl.Model.Mongodb.provider.get_database('DEFAULT').then(function(connection) {
        var db;
        _this.connection = connection;
        db = _this.connection.db('local');
        return _this.collection = db.collection('oplog.rs');
      });
    };

    Tails.prototype.start = function() {
      var _this = this;
      return this.connect().then(function() {
        return _this.loop();
      });
    };

    Tails.prototype.loop = function() {
      var make_pass,
        _this = this;
      make_pass = function() {
        return _this.single_pass().then(q.delay(2500)).then(make_pass);
      };
      return make_pass();
    };

    Tails.prototype.single_pass = function() {
      var _this = this;
      return this.last_timestamp().then(function(ts) {
        var cursor;
        cursor = _this.collection.find({
          ts: {
            $gt: ts
          }
        }, {
          tailable: true
        });
        return _this.iterate_cursor(cursor);
      });
    };

    Tails.prototype.iterate_cursor = function(cursor) {
      var d,
        _this = this;
      d = q.defer();
      cursor.each(function(err, item) {
        var col, db, op, _ref, _ref1, _x;
        if (err != null) {
          return d.reject(err);
        }
        if (item == null) {
          return d.resolve();
        }
        if (item.ns) {
          _ref = /^([^\.]+)\.(.+)$/.exec(item.ns), _x = _ref[0], db = _ref[1], col = _ref[2];
        }
        if (db !== _this.dbName) {
          return;
        }
        op = {
          ts: new Date(1000 * item.ts.high_),
          id: item.h.toNumber(),
          database: db,
          collection: col,
          type: item.op,
          name: OP_NAMES[item.op]
        };
        if (item.op === 'u') {
          op.query = item.o2;
          op.update = item.o;
        } else if ((_ref1 = item.op) === 'i' || _ref1 === 'd' || _ref1 === 'c' || _ref1 === 'db') {
          op.document = item.o;
        }
        try {
          _this.emit('operation', op);
          if (item.ts > _this.lastTimestamp) {
            return _this.lastTimestamp = item.ts;
          }
        } catch (_error) {
          err = _error;
          cursor.close();
          return d.reject(err);
        }
      });
      return d.promise;
    };

    Tails.prototype.last_timestamp = function() {
      if (this.lastTimestamp != null) {
        return q(this.lastTimestamp);
      }
      return q.ninvoke(this.collection.find().sort({
        $natural: 1
      }).limit(1), 'nextObject').then(function(doc) {
        return doc.ts;
      });
    };

    return Tails;

  })(EventEmitter);

  exports.Tails = Tails;

  exports.tail = function(conn_url) {
    return new Tails({
      url: conn_url
    });
  };

}).call(this);
