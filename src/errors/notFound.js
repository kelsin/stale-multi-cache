'use strict';

module.exports = function NotFoundError(key) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.key = key;
  this.message = key + ' not found in cache';
};

require('util').inherits(module.exports, Error);
