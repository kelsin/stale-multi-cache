# stale-multi-cache
Multi level cache that always prefers stale data

[![Version](https://img.shields.io/npm/v/stale-multi-cache.svg)](https://www.npmjs.com/package/stale-multi-cache)
[![Build Status](https://img.shields.io/travis/kelsin/stale-multi-cache.svg)](https://travis-ci.org/kelsin/stale-multi-cache)
[![Coverage](https://img.shields.io/codecov/c/github/kelsin/stale-multi-cache.svg)](https://codecov.io/gh/kelsin/stale-multi-cache)
[![License](https://img.shields.io/npm/l/stale-multi-cache.svg)](http://spdx.org/licenses/MIT)

## Usage

Version 0.0.1 is not usable yet, will be making public api for a 1.0.0 release
in the next few days after more testing.

```js
var Cache = require('stale-multi-cache');
var Redis = require('ioredis');
var redis = new Redis();

// Create the cache
var cache = new Cache([
  new Cache.LRUMemoryStore({max:500}),
  new Cache.RedisStore(redis)
]);

function getUser(user) {
  // really really slow function
  return {};
}

// Even with a TTL of 10, this cache will always send stale data,
// but do a background update of the data after the data expires.
function cachedGetUser(user) {
  return cache.wrap('user:'+user, function() {
    return getUser(user);
  }, 10);
}

// Now we can use the cachedGetUser
app.get('/user', function(req, res) {
  return cachedGetUser('kelsin').then(function(user) {
    return res.json({user:user});
  });
});
```

## Stores

| Store | Description |
| --- | --- |
| `NoopStore` | Store that never stores anything, for testing purposes |
| `SimpleMemoryStore` | Object store, for testing purposes |
| `LRUStore` | Memory store that uses [lru-cache](https://www.npmjs.com/package/lru-cache) |
| `RedisStore` | Redis store that uses any [ioredis](https://www.npmjs.com/package/ioredis) compatible client |

## Why?

I often need caches that are double buffered but where TTL is more of an update
interval than a hard expire. I want to use LRU based stores and update at set
times but always keep stale data. I never want most web caches to expire. I'd
rather have old data on the site than no data on the site. This cache provides
that.
