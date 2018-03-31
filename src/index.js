import Redis from 'ioredis';

import { Cache } from 'src/cache';
import { ErrorStore } from 'src/stores/error';
import { LRUMemoryStore } from 'src/stores/lru';
import { NoopStore } from 'src/stores/noop';
import { RedisStore } from 'src/stores/redis';
import { SimpleMemoryStore } from 'src/stores/simple';
import { Util, Is } from 'src/util';

export {
    Redis,
    Cache,
    ErrorStore,
    LRUMemoryStore,
    NoopStore,
    RedisStore,
    SimpleMemoryStore,
    Util,
    Is
}
