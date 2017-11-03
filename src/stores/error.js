// No-op cache store
//
// This store does nothing on set, and always returns a rejected promise on gets

var Promise = require('bluebird');
var NotFoundError = require('../errors/notFound');

function ErrorStore() {
}

ErrorStore.prototype.get = function get(key) {
  return Promise.reject(new Error("Calling get on ErrorStore", key));
};

ErrorStore.prototype.set = function get(key, value) {
  return Promise.reject(new Error("Calling set on ErrorStore"));
};

module.exports = ErrorStore;
