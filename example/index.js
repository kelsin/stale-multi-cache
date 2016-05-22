var Promise = require('bluebird');
var express = require('express');
var Cache = require('../index');

// Setup cache
var cache = new Cache([new Cache.SimpleMemoryStore()]);
var number = 0;

var func = function() {
  var temp = number;
  number = number + 1;
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(temp);
    }, 2500);
  });
};

var app = express();

app.get('/stale', function(req, res) {
  cache.wrap('stale', func, 5, undefined)
    .then(function(value) {
      res.json({type: 'stale', value:value});
    });
});

app.get('/expire', function(req, res) {
  cache.wrap('expire', func, undefined, 5)
    .then(function(value) {
      res.json({type: 'expire', value:value});
    });
});

app.get('/both', function(req, res) {
  cache.wrap('both', func, 5, 10)
    .then(function(value) {
      res.json({type: 'both', value:value});
    });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
