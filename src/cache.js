// Main Cache Interface
const Promise = require('bluebird');
const hash = require('object-hash');
const moment = require('moment');
const _ = require('lodash');

const Value = require('./value');
const NotFoundError = require('./errors/notFound');

const defaultOptions = {
  name: 'default',
  bypassHeader: 'cache-bypass'
};

function Cache(stores = [], options = {}) {
  if(!(stores instanceof Array)) {
    stores = [stores];
  }

  this.stores = stores;
  this.options = Object.assign({},
                               defaultOptions,
                               options);
};

Cache.prototype.getStores = function getStores() {
  return this.stores;
};

Cache.prototype.getKey = function getKey(obj = {}) {
  return this.options.name + ':cache:' + hash(obj);
};

const multiSet = function(stores, key, value) {
  return Promise.map(stores,
                     function(store) {
                       return store.set(key, value);
                     })
    .then(function() {
      return value;
    })
    .catch(function() {
      return value;
    });
};

Cache.prototype.set = function set(key, value) {
  return multiSet(this.stores, key, value);
};

const processSearchResult = function(search) {
  // If we found it, return
  if(search.found) {
    return search.value;
  } else {
    // Otherwise throw a not found
    throw new NotFoundError(search.key);
  }
};

Cache.prototype.get = function get(key) {
  let self = this;

  // Accumulator object
  let search = {
    found: false,
    stores: [],
    key: key
  };

  return Promise.reduce(
    this.stores,
    function(search, store) {
      // If we've found the item already, just return
      if(search.found) {
        return search;
      }

      // Otherwise check this store
      return store.get(key).then(function(value) {
        // After this function returns,
        // set this value in the failed stores
        process.nextTick(function() {
          self.lastPromise = multiSet(search.stores, key, value);
        });

        // We found it!
        search.found = true;
        search.value = value;
        return search;

      }).catch(function(err) {
        // Error or not found, just keep looking
        search.stores.push(store);
        return search;
      });
    },
    search)
    .then(processSearchResult);
};

Cache.prototype.createValueAndMultiSet = function(key, data, opts = {}) {
  let value = new Value(data);

  opts = Object.assign({}, this.options, opts);

  value.setStaleTTL(opts.staleTTL);
  value.setExpireTTL(opts.expireTTL);

  return multiSet(this.stores, key, JSON.stringify(value))
    .then(function() {
      return value;
    });
};

Cache.prototype.refresh = function(key, func, options = {}) {
  let self = this;
  return Promise.try(func).then(function(data) {
    return self.createValueAndMultiSet(key, data, options);
  }).then(function(value) {
    return value.get();
  });
};

Cache.prototype.wrap = function wrap(key, func, options = {}) {
  let self = this;

  key = this.getKey(key);

  // First try and get the key
  return this.get(key).then(function(raw) {
    let value = Value.fromJSON(raw);

    if(value.expired()) {
      // Expire values wait for us to get them again, throwing errors
      return self.refresh(key, func, options);

    } else if(value.stale()) {
      // Stale values update on next tick
      process.nextTick(function() {
        self.lastPromise = Promise.try(func).then(function(data) {
          return self.createValueAndMultiSet(key, data, options);
        }).catch(function(err) {
          // Error getting new value... do nothing
        });
      });
    }

    // As long as not expired, return it!
    return value.get();
  }).catch(function(err) {
    // We couldn't find the value in the cache.
    // Run the function and then set it
    return self.refresh(key, func, options);
  });
};

const addContent = function addContent(cache, content = '') {
  if (Buffer.isBuffer(content)) {
    var oldContent = cache.content
    if (!oldContent) {
      oldContent = Buffer.alloc(0);
    }
    cache.content = Buffer.concat([oldContent, content], oldContent.length + content.length);
  } else {
    cache.content = (cache.content || '') + content;
  }
};

Cache.prototype.middleware = function middleware(opts = {}) {
  let self = this;
  opts = Object.assign({}, this.options, opts);

  return function(req, res, next) {
    // Bypass if we supplied header
    if(req.headers[opts.bypassHeader]) {
      next();
    }

    let key = req.originalUrl;

    return self.get(key).then(function(raw) {
      let value = Value.fromJSON(raw);

      if(value.expired() || value.stale()) {
        throw new Error("Value stale or expired");
      }

      let cached = value.get();

      let data = cached.content;
      if (typeof data !== "string") {
        data = Buffer.from(data.data);
      }

      res.writeHead(cached.status, cached.headers);
      return res.end(data, cached.encoding);

    }).catch(function(err) {
      // No value in cache
      res._cache = {
        write: res.write,
        end: res.end,
        content: undefined
      };

      // patch res.write
      res.write = function(content) {
        addContent(res._cache, content);
        return res._cache.write.apply(res, [content]);
      }

      // patch res.end
      res.end = function(content, encoding) {
        addContent(res._cache, content);

        if (res._cache.content) {
          // Save the content and headers
          let data = Object.assign({}, {
            content: res._cache.content,
            headers: res.getHeaders(),
            status: res.statusCode,
            encoding
          });

          return self.createValueAndMultiSet(key, data, opts)
            .then(function() {
              return res._cache.end.apply(res, [content, encoding]);
            });
        } else {
          return res._cache.end.apply(res, [content, encoding]);
        }
      }

      return next();
    });
  };
};

module.exports = Cache;
