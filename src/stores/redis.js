// Wrapper around any ioredis compatible redis client
var NotFoundError = require('../errors/notFound');

function RedisStore(client) {
  this.client = client;
};

RedisStore.prototype.get = function get(key) {
  return this.client.get(key).then(function(value) {
    if(value) {
      return value;
    } else {
      throw new NotFoundError(key);
    }
  });
};

RedisStore.prototype.set = function set(key, value) {
  return this.client.set(key, value).then(function() {
    return value;
  });
};

module.exports = RedisStore;
