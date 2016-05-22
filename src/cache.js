// Main Cache Interface
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');

var Value = require('./value');
var errors = require('./errors');

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

Cache.prototype.set = function set(key, value) {
  // Set it in all caches
  return Promise.map(this.stores,
                     function(store) {
                       return store.set(key, value);
                     })
    .then(function() {
      return value;
    });
};

var processSearchResult = function(search) {
  // If we found it, return
  if(search.found) {
    return search.value;
  } else {
    // Otherwise throw a not found
    throw errors.notFound(search.key);
  }
};

Cache.prototype.get = function get(key) {
  // Accumulator object
  var search = {
    found: false,
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
        // We found it!
        search.found = true;
        search.value = value;
        return search;

      }).catch(function(err) {
        // Error or not found, just keep looking
        return search;
      });
    },
    search)
    .then(processSearchResult);
};

module.exports = Cache;
