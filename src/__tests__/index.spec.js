// @flow
// region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
// endregion

import { Cache } from 'src/cache';
import { ErrorStore } from 'src/stores/error';
import { LRUMemoryStore } from 'src/stores/lru';
import { NoopStore } from 'src/stores/noop';
import { RedisStore } from 'src/stores/redis';
import { SimpleMemoryStore } from 'src/stores/simple';

describe('index', () => {
    test('should return stores', () => {
        expect(Cache.getClassName()).toEqual('Cache');
        expect(ErrorStore.getClassName()).toEqual('ErrorStore');
        expect(LRUMemoryStore.getClassName()).toEqual('LRUMemoryStore');
        expect(NoopStore.getClassName()).toEqual('NoopStore');
        expect(RedisStore.getClassName()).toEqual('RedisStore');
        expect(SimpleMemoryStore.getClassName()).toEqual('SimpleMemoryStore');
    });
});
