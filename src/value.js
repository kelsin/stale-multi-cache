// Object that stores data in cache stores
var moment = require('moment');

var ttlToExpires = function ttlToExpires(ttl) {
  return moment().add(ttl, 'seconds');
};

function Value(value, ttl) {
  this.value = value;
  this.expires = ttlToExpires(ttl);
};

Value.prototype.get = function get() {
  return this.value;
};

Value.prototype.set = function set(value) {
  this.value = value;
};

Value.prototype.ttl = function ttl(seconds) {
  this.expires = ttlToExpires(seconds);
};

Value.prototype.expired = function() {
  return moment().isSameOrAfter(this.expires);
};

module.exports = Value;
