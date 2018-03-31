// @flow
// region typing, stripped during compiling
import type { describe, test, expect, afterAll, beforeAll } from '@types/jest';
// endregion

import Redis from 'ioredis';

import { RedisStore } from 'src/stores/redis';
import { NotFoundError } from 'src/errors/notFound';

describe('RedisStore', () => {
    const redis = new Redis({
        enableOfflineQueue: true,
        enableReadyCheck: true,
        autoResendUnfulfilledCommands: true,
        dropBufferSupport: true,
        lazyConnect: true,
        parser: 'javascript',
    });

    beforeAll( async () => {
        await redis.flushall();
    });
    
    afterAll( async () => {
        await redis.disconnect();
    });

    describe('compress=true', () => {
        const store = RedisStore.build(redis);

        describe('#getClassName()', () => {
            test('should return class name', () => {
                expect(store.getClassName()).toEqual('RedisStore');
            });
        });

        describe(`#set()`, () => {
            test('should return a resolved promise for a set value', async () => {
                await expect(store.set('test', 'value')).resolves.toBeDefined();
            });
        });

        describe(`#get()`, () => {
            test('should return a resolved promise', async () => {
                await expect(store.set('test', 'value')).resolves.toBeDefined();
                await expect(store.get('test')).resolves.toEqual('value');
            });

            test('should return a rejected promise for an unknown value', async () => {
                await expect(store.get('unknown')).rejects.toBeInstanceOf(NotFoundError);
                await expect(store.get('unknown')).rejects.toEqual(NotFoundError.build('unknown'));
            });
        });
    });

    describe('compress=false', () => {
        const store = RedisStore.build(redis, { compress: false });

        describe('#getClassName()', () => {
            test('should return class name', () => {
                expect(store.getClassName()).toEqual('RedisStore');
            });
        });

        describe(`#set()`, () => {
            test('should return a resolved promise for a set value', async () => {
                await expect(store.set('test', 'value')).resolves.toBeDefined();
            });
        });

        describe(`#get()`, () => {
            test('should return a resolved promise', async () => {
                await expect(store.set('test', 'value')).resolves.toBeDefined();
                await expect(store.get('test')).resolves.toEqual('value');
            });

            test('should return a rejected promise for an unknown value', async () => {
                await expect(store.get('unknown')).rejects.toBeInstanceOf(NotFoundError);
                await expect(store.get('unknown')).rejects.toEqual(NotFoundError.build('unknown'));
            });
        });
    });
});
