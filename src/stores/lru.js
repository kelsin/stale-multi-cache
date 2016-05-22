// In memory LRU cache using node-lru-cache
var LRU = require('lru-cache');
var Promise = require('bluebird');
var NotFoundError = require('../errors/notFound');

function LRUMemoryStore(options) {
  this.cache = LRU(options);
};

LRUMemoryStore.prototype.get = function get(key) {
  var value = this.cache.get(key);
  if(value === undefined) {
    return Promise.reject(new NotFoundError(key));
  } else {
    return Promise.resolve(value);
  }
};

LRUMemoryStore.prototype.set = function set(key, value) {
  this.cache.set(key, value);
  return Promise.resolve(value);
};

module.exports = LRUMemoryStore;
