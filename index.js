// Entry point exposing all classes and main cache interface
module.exports = require('./src/cache');
module.exports.LRUMemoryStore = require('./src/stores/lru');
module.exports.RedisStore = require('./src/stores/redis');
module.exports.NoopStore = require('./src/stores/noop');
module.exports.SimpleMemoryStore = require('./src/stores/simple');
