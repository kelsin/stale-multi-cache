// Simple in memory cache made with an object... I meant simple
var Promise = require('bluebird');
var NotFoundError = require('../errors/notFound');

function SimpleMemoryStore(options) {
  this.data = {};
};

SimpleMemoryStore.prototype.get = function get(key) {
  if(this.data.hasOwnProperty(key)) {
    return Promise.resolve(this.data[key]);
  } else {
    return Promise.reject(new NotFoundError(key));
  }
};


SimpleMemoryStore.prototype.set = function set(key, value) {
  this.data[key] = value;
  return Promise.resolve(value);
};

module.exports = SimpleMemoryStore;
