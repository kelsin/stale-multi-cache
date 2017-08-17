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

/**
 * A cache object
 *
 * Takes in an array of stores and a hash of options
 **/
function Cache(stores = [], options = {}) {
  if(!(stores instanceof Array)) {
    stores = [stores];
  }

  this.stores = stores;
  this.options = Object.assign({},
                               defaultOptions,
                               options);
};

// Returns the list of stores
Cache.prototype.getStores = function getStores() {
  return this.stores;
};

// A key generator based on [object-hash](https://github.com/puleos/object-hash)
Cache.prototype.getKey = function getKey(obj = {}) {
  return this.options.name + ':cache:' + hash(obj);
};

// Sets a value in all stores, no manipulation of value at all
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

// Returns raw data out of the stores, repopulating stores that don't have the
// data from ones that do.
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

// Puts the raw data into a Value object and then sets it in the stores
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

// Calls the function, storing the response
Cache.prototype.refresh = function(key, func, options = {}) {
  let self = this;
  return Promise.try(func).then(function(data) {
    return self.createValueAndMultiSet(key, data, options);
  }).then(function(value) {
    return value.get();
  });
};

// Wraps a function with the caching handling stale and expired states correctly
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

// A connect middleware that supports stale and expired correctly
Cache.prototype.middleware = function middleware(opts = {}) {
  let self = this;
  opts = Object.assign({}, this.options, opts);

  return function(req, res, next) {
    // Bypass if we supplied header
    if(req.headers[opts.bypassHeader]) {
      next();
    }

    let key = self.getKey({ url: req.originalUrl });

    res._cache = {
      write: res.write.bind(res),
      end: res.end.bind(res),
      getHeader: res.getHeader.bind(res),
      removeHeader: res.removeHeader.bind(res),
      setHeader: res.setHeader.bind(res),
      content: undefined,
      headers: [],
      stale: false,
      expired: false
    };

    return self.get(key).then(function(raw) {
      let value = Value.fromJSON(raw);

      if(value.expired()) {
        res._cache.expired = true;
        throw new Error("Value expired");
      }

      let cached = value.get();

      let data = cached.content;
      if (typeof data !== "string") {
        data = Buffer.from(data.data);
      }

      _.forEach(cached.headers, ([name, value]) => res.setHeader(name, value));
      res.writeHead(cached.status);
      res.end(data, cached.encoding);

      if(value.stale()) {
        res._cache.stale = true;
        throw new Error("Value stale");
      }

      return data;

    }).catch(function(err) {
      // No value in cache

      res.getHeader = function(name) {
        let header = _.find(res._cache.headers,
                            ([key, value]) => key === name);

        if(header) {
          return header[1];
        }
      };

      res.removeHeader = function(name) {
        res._cache.headers = _.filter(res._cache.headers,
                                      ([key, value]) => key !== name);
      }

      res.setHeader = function(name, value) {
        res.removeHeader(name);
        res._cache.headers.push([name, value]);
      };

      // patch res.write
      res.write = function(content) {
        addContent(res._cache, content);
        if(!res._cache.stale) {
          return res._cache.write.apply(res, [content]);
        }
      };

      // patch res.end
      res.end = function(content, encoding) {
        addContent(res._cache, content);

        let applyEnd = function() {
          if(!res._cache.stale) {
            _.forEach(res._cache.headers, function(args) {
              res._cache.setHeader.apply(res, args);
            });
            return res._cache.end.apply(res, [content, encoding]);
          }
        };

        if (res._cache.content) {
          // Save the content and headers
          let data = Object.assign({}, {
            content: res._cache.content,
            headers: res._cache.headers,
            status: res.statusCode,
            encoding
          });

          return self.createValueAndMultiSet(key, data, opts)
            .then(applyEnd);
        } else {
          return applyEnd();
        }
      };

      return next();
    });
  };
};

module.exports = Cache;
