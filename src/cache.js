// Main Cache Interface
var Promise = require('bluebird');
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

Cache.prototype.set = function set(key, value, ttl) {
  // Wrap this object in a value
  var wrapped = new Value(value, ttl);

  // Set it in all caches
  return Promise.map(this.stores,
                     function(store) {
                       store.set(key, wrapped);
                     })
    .then(function() {
      return value;
    });
};

var processSearchResult = function(search) {
  // If we found it, return
  if(search.found) {
    return search.value.get();
  } else {
    // Otherwise throw a not found
    throw errors.notFound(search.key);
  }
};

Cache.prototype.get = function get(key) {
  // Accumulator object
  var search = {
    found: false,
    key: key,
    stores: []
  };

  return Promise.reduce(this.stores,
                 function(search, store) {
                   // If we've found the item already, just return
                   if(search.found) {
                     return search;
                   }

                   // Otherwise check this store
                   return store.get(key).then(function(value) {
                     // We found it!
                     // Populate other stores with this data
                     _.forEach(search.stores, function(store) {
                       store.set(key, value);
                     });

                     search.found = true;
                     search.value = value;
                     return search;

                   }).catch(function(err) {
                     // Error or something else, just keep looking
                     search.stores.push(store);
                     return search;
                   });
                 },
                 search)
    .then(processSearchResult);
};

module.exports = Cache;
