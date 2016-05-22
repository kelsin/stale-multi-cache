// Object that stores data in cache stores
var moment = require('moment');

function Value(value, expires) {
  this.value = value;
  this.expires = expires;
};

Value.prototype.get = function get() {
  return this.value;
};

Value.prototype.getExpires = function getExpires() {
  return this.expires;
};

Value.prototype.set = function set(value) {
  this.value = value;
};

Value.prototype.setExpires = function setExpires(expires) {
  this.expires = expires;
};

Value.prototype.expired = function() {
  if(this.expires === undefined) {
    return false;
  } else {
    return moment().isSameOrAfter(this.expires);
  }
};

module.exports = Value;
