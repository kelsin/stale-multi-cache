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

Cache.prototype.wrap = function wrap(key, func, ttl) {
  var self = this;

  // First try and get the key
  return this.get(key).then(function(value) {
    // We have a value, is it expired?
    if(value.expired()) {
      // In the next tick refresh
      process.nextTick(function() {
        var data = func();

        process.nextTick(function() {
          var expires = moment().add(ttl, 'seconds');
          var value = new Value(data, expires);
          return multiSet(self.stores, key, value);
        });
      });
    }

    // Whether expired or not... return it!
    return value.get();
  }).catch(function(err) {
    // We couldn't find the value in the cache.
    // Run the function and then set it
    return Promise.resolve(func()).then(function(data) {
      // On next tick save this result in all caches
      process.nextTick(function() {
        var expires = moment().add(ttl, 'seconds');
        var value = new Value(data, expires);
        return multiSet(self.stores, key, value);
      });

      // return it!
      return data;
    });
  });
};

module.exports = Cache;
