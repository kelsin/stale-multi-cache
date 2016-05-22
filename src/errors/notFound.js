'use strict';

// Custom error class based on:
// https://gist.github.com/justmoon/15511f92e5216fa2624b
module.exports = function NotFoundError(key) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.key = key;
  this.message = key + ' not found in cache';
};

require('util').inherits(module.exports, Error);
