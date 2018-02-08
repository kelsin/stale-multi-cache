// Object that stores data in cache stores
var moment = require('moment');

function Value(value, created) {
  this.value = value;
  this.created = created || moment();
  this.staleTTL = undefined;
  this.staleAt = undefined;
  this.expireTTL = undefined;
  this.expireAt = undefined;
};

Value.prototype.get = function get() {
  return this.value;
};

Value.prototype.getCreated = function getCreated() {
  return this.created;
};

Value.prototype.getExpireTTL = function getExpireTTL() {
  return this.expireTTL;
};

Value.prototype.getExpireAt = function getExpires() {
  return this.expireAt;
};

Value.prototype.getStaleTTL = function getStaleTTL() {
  return this.staleTTL;
};

Value.prototype.getStaleAt = function getStaleAt() {
  return this.staleAt;
};

Value.prototype.getMaxAge = function getMaxAge() {
  let end = this.staleAt;
  if(typeof end === "undefined") {
    end = this.expireAt;
  }

  if(end) {
    let diff = end.diff(moment(), 'seconds');
    return Math.max(0, diff);
  } else {
    return 0;
  }
};

Value.prototype.getCacheControl = function getCacheControl() {
  let maxAge = this.getMaxAge();

  if(maxAge > 0) {
    return `public, max-age=${maxAge}`;
  } else {
    return 'no-cache, no-store, must-revalidate';
  }
};

Value.prototype.set = function set(value) {
  this.value = value;
};

Value.prototype.setExpireTTL = function setExpireTTL(expireTTL) {
  this.expireTTL = expireTTL;
  if(expireTTL === undefined) {
    this.expireAt = undefined;
  } else {
    this.expireAt = moment(this.created).add(expireTTL, 'seconds');
  }
};

Value.prototype.setStaleTTL = function setStaleTTL(staleTTL) {
  this.staleTTL = staleTTL;
  if(staleTTL === undefined) {
    this.staleAt = undefined;
  } else {
    this.staleAt = moment(this.created).add(staleTTL, 'seconds');
  }
};

Value.prototype.expired = function() {
  if(this.expireAt === undefined) {
    return false;
  } else {
    return moment().isSameOrAfter(this.expireAt);
  }
};

Value.prototype.stale = function() {
  if(this.staleAt === undefined) {
    return false;
  } else {
    return moment().isSameOrAfter(this.staleAt);
  }
};

Value.prototype.toJSON = function() {
  return {
    value: this.value,
    created: this.created,
    staleTTL: this.staleTTL,
    expireTTL: this.expireTTL
  };
};

Value.fromJSON = function fromJSON(json) {
  var parsed = JSON.parse(json);
  var value = new Value(parsed.value, moment(parsed.created));
  value.setStaleTTL(parsed.staleTTL);
  value.setExpireTTL(parsed.expireTTL);
  return value;
};

module.exports = Value;
