// No-op cache store
//
// This store does nothing on set, and always returns a rejected promise on gets

var Promise = require('bluebird');
var NotFoundError = require('../errors/notFound');

function NoopStore() {
}

NoopStore.prototype.get = function get(key) {
  return Promise.reject(new NotFoundError(key));
};

NoopStore.prototype.set = function get(key, value) {
  return Promise.resolve(value);
};

module.exports = NoopStore;
