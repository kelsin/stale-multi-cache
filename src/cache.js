// Main Cache Interface
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');

var Value = require('./value');
var NotFoundError = require('./errors/notFound');

function Cache(stores) {
  if(stores === undefined) {
    stores = [];
  } else if(!(stores instanceof Array)) {
    stores = [stores];
  }

  this.stores = stores;
};

Cache.prototype.getStores = function getStores() {
  return this.stores;
};

var multiSet = function(stores, key, value) {
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

var processSearchResult = function(search) {
  // If we found it, return
  if(search.found) {
    return search.value;
  } else {
    // Otherwise throw a not found
    throw new NotFoundError(search.key);
  }
};

Cache.prototype.get = function get(key) {
  // Accumulator object
  var search = {
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
          return multiSet(search.stores, key, value);
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

Cache.prototype.createValueAndMultiSet = function(key, data, staleTTL, expireTTL) {
  var value = new Value(data);
  value.setStaleTTL(staleTTL);
  value.setExpireTTL(expireTTL);
  return multiSet(this.stores, key, JSON.stringify(value))
    .then(function() {
      return value;
    });
};

Cache.prototype.refresh = function(key, func, staleTTL, expireTTL) {
  var self = this;
  return Promise.try(func).then(function(data) {
    return self.createValueAndMultiSet(key, data, staleTTL, expireTTL);
  }).then(function(value) {
    return value.get();
  });
};

Cache.prototype.wrap = function wrap(key, func, staleTTL, expireTTL) {
  var self = this;

  // First try and get the key
  return this.get(key).then(function(raw) {
    var value = Value.fromJSON(raw);

    if(value.expired()) {
      // Expire values wait for us to get them again, throwing errors
      return self.refresh(key, func, staleTTL, expireTTL);

    } else if(value.stale()) {
      // Stale values update on next tick
      process.nextTick(function() {
        self.lastPromise = Promise.try(func).then(function(data) {
          return self.createValueAndMultiSet(key, data, staleTTL, expireTTL);
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
    return self.refresh(key, func, staleTTL, expireTTL);
  });
};

module.exports = Cache;
