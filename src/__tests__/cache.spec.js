// @flow
// region typing, stripped during compiling
import type { describe, test, expect, jest } from '@types/jest';
import type { Buffer } from '@types/node';
// endregion

import delay from 'delay';
import Promise from 'bluebird';
import express from 'express';
import request from 'supertest';

import { Cache } from 'src/cache';
import { Value } from 'src/value';

import { NoopStore } from 'src/stores/noop';
import { ErrorStore } from 'src/stores/error';
import { SimpleMemoryStore } from 'src/stores/simple';

const { Date } = global;

describe('Cache', () => {
    describe('#getClassName()', () => {
        test('should return class name', () => {
            const cache = new Cache();
            expect(cache.getClassName()).toEqual('Cache');
        });
    });

    describe('#getStores()', () => {
        test('should return [] for the default store list', () => {
            const cache = new Cache();

            expect(cache.getStores()).toEqual([]);
        });

        test('should return passed in array of stores', () => {
            const stores = [1, 2];
            const cache = new Cache(stores);

            expect(cache.getStores()).toEqual(stores);
        });
    });

    describe('#getKey()', () => {
        test('should generate a identical key for different objects that are the same', () => {
            const cache = new Cache();
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 2, a: 1 };
            const obj3 = { a: 2, b: 1 };

            expect(cache.getKey(obj1)).toEqual(cache.getKey(obj2));
            expect(cache.getKey(obj1)).not.toEqual(cache.getKey(obj3));
            expect(cache.getKey(obj2)).not.toEqual(cache.getKey(obj3));
            expect(cache.getKey(obj1)).toContain('default:cache:');
            expect(cache.getKey()).toContain('default:cache:');
        });

        test('should allow for custom hash names', () => {
            const cache = new Cache([], { name: 'custom' });
            const obj = { a: 1, b: 2 };

            expect(cache.getKey(obj)).toContain('custom:cache:');
        });
    });

    describe('#set()', () => {
        describe('with no stores', () => {
            test('should resolve to the value', async () => {
                const cache = new Cache();
                await expect(cache.set('test', 'value')).resolves.toEqual('value');
            });
        });

        describe('with a simple store', () => {
            test('should resolve to the value', async () => {
                const store = new SimpleMemoryStore();
                const cache = new Cache(store);
                await expect(cache.set('test', 'value')).resolves.toEqual('value');
            });

            test('should set the key to the value', async () => {
                const store = new SimpleMemoryStore();
                const cache = new Cache(store);

                return await cache.set('test', 'value').then(() => expect(cache.get('test')).resolves.toEqual('value'));
            });
        });
    });

    describe('#get()', () => {
        describe('with no stores', () => {
            test('should return a not found error', async () => {
                const cache = new Cache();
                await expect(cache.get('test')).rejects.toBeInstanceOf(Error);
            });
        });

        describe('with a NoopStore', () => {
            test('should return a not found error', async () => {
                const cache = new Cache(new NoopStore());
                await expect(cache.get('test')).rejects.toBeInstanceOf(Error);
            });
        });

        describe('with a SimpleMemoryStore', () => {
            test('should return a not found error', async () => {
                const store = new SimpleMemoryStore();
                const cache = new Cache(store);
                await expect(cache.get('test')).rejects.toBeInstanceOf(Error);
            });

            test('should be able to save a value', async () => {
                const store = new SimpleMemoryStore();
                const cache = new Cache(store);
                await store.set('test', 'value').then(() => expect(cache.get('test')).resolves.toEqual('value'));
            });
        });

        describe('with a Noop AND Simple Store', () => {
            test('should return a not found error', async () => {
                const noop = new NoopStore();
                const simple = new SimpleMemoryStore();
                const cache = new Cache([noop, simple, noop]);
                await expect(cache.get('test')).rejects.toBeInstanceOf(Error);
            });

            test('should return the value from the simple store', async () => {
                const noop = new NoopStore();
                const simple = new SimpleMemoryStore();
                const cache = new Cache([noop, simple, noop]);

                return await simple
                    .set('test', 'value')
                    .then(() => expect(cache.get('test')).resolves.toEqual('value'));
            });
        });

        describe('with multiple stores', () => {
            test('should set the found value in failed stores', async () => {
                const simple1 = new SimpleMemoryStore();
                const simple2 = new SimpleMemoryStore();
                const simple3 = new SimpleMemoryStore();
                const cache = new Cache([simple1, simple2, simple3]);

                // Set our value in the middle store
                await simple2.set('test', 'value');
                await Promise.all([
                    expect(simple1.get('test')).rejects.toBeInstanceOf(Error),
                    expect(simple2.get('test')).resolves.toEqual('value'),
                    expect(simple3.get('test')).rejects.toBeInstanceOf(Error)
                ]);

                // await delay(1000);

                // Now get that value out of the cache
                const value = await cache.get('test');
                expect(value).toEqual('value');

                // Verify last promise
                await cache.lastPromise;
                await expect(simple1.get('test')).resolves.toEqual('value');
                await expect(simple2.get('test')).resolves.toEqual('value');
                await expect(simple3.get('test')).rejects.toBeInstanceOf(Error);
            });
        });
    });

    describe('#wrap()', () => {
        const simpleStore1 = new SimpleMemoryStore();
        const simpleStore2 = new SimpleMemoryStore();
        const noopStore = new NoopStore();
        const errorStore = new ErrorStore();

        let asyncMock;
        let cache;
        let count = 0;

        beforeEach(() => {
            asyncMock = jest.fn(() => (count += 1));
            cache = new Cache([simpleStore1, simpleStore2]);
        });

        afterEach(() => {
            count = 0;
            asyncMock.mockReset();
        });

        test('should not call the function more than once', async () => {
            const cached = () => cache.wrap('test1', asyncMock, { staleTTL: 300 });

            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(1);
            expect(asyncMock).toHaveBeenCalledTimes(1);
        });

        test('should not call the function more than once with default staleTTL', async () => {
            const cached = function() {
                return cache.wrap('test2', asyncMock);
            };

            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(1);
            expect(asyncMock).toHaveBeenCalledTimes(1);
        });

        test('expired values should be refreshed immediately', async () => {
            const cached = function() {
                return cache.wrap('test3', asyncMock, { expireTTL: 0 });
            };

            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(2);
            expect(asyncMock).toHaveBeenCalledTimes(2);
        });

        test('expired values should be refreshed immediately with default expireTTL', async () => {
            const localCache = new Cache([simpleStore1, simpleStore2], { expireTTL: 0 });
            const cached = function() {
                return localCache.wrap('test4', asyncMock);
            };

            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(2);
            expect(asyncMock).toHaveBeenCalledTimes(2);
        });

        test('should be ok if sets fail', async () => {
            const localCache = new Cache([noopStore, errorStore]);
            const cached = function() {
                return localCache.wrap('test5', asyncMock, { expireTTL: 0 });
            };

            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(2);
            await expect(cached()).resolves.toEqual(3);
            expect(asyncMock).toHaveBeenCalledTimes(3);
        });
    
        test('should have a debug object when debug=true', async () => {
    
            const localCache = new Cache([simpleStore1], { debug: true });
            const cached = function() {
                return localCache.wrap('debug', asyncMock, { expireTTL: 500 });
            };
    
            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toHaveProperty('_cache');
        });
        
        test('should refresh any stale cache in the background', async () => {
            const cached = function() {
                return cache.wrap('test5', asyncMock, { staleTTL: 0 });
            };

            const key = cache.getKey('test5');

            // value should
            await expect(cached()).resolves.toEqual(1);
            await expect(cached()).resolves.toEqual(1);
            expect(asyncMock).toHaveBeenCalledTimes(2);

            await delay(500);
            await expect(cache.lastPromise).resolves.toHaveProperty('value', 2);
            await expect(cached()).resolves.toEqual(2);
            expect(asyncMock).toHaveBeenCalledTimes(3);

            await delay(500);
            await expect(cache.lastPromise).resolves.toHaveProperty('value', 3);
            await expect(cached()).resolves.toEqual(3);
            expect(asyncMock).toHaveBeenCalledTimes(4);

            await cache.get(key).then(raw => {
                const value = Value.fromJSON(raw);
                expect(value.get()).toEqual(3);
                return value;
            });
        });

        describe('express', () => {
            const asyncMock = jest
                .fn(() => 'default')
                .mockImplementationOnce(() => 'first')
                .mockImplementationOnce(() => {
                    throw new Error('rejected');
                })
                .mockImplementationOnce(() => 'second');

            const simpleStore1 = new SimpleMemoryStore();
            const simpleStore2 = new SimpleMemoryStore();
            const options = {
                name: 'express'
            };
            const cache = new Cache([simpleStore1, simpleStore2], options);

            const app = express();

            app.get('/', (req, res, next) => {
                cache.wrap('test', asyncMock, { staleTTL: 0 }).then(value => {
                    if (typeof value === 'string') {
                        res.status(200).json({ value });
                    } else {
                        res.status(404).json({ value });
                    }
                });
            });

            afterEach(() => {
                asyncMock.mockClear();
                asyncMock.mockRestore();
            });

            test('should return a response', async () => {
                const response = await request(app).get('/');
                expect(asyncMock).toHaveBeenCalledTimes(1);
                expect(response.body).toHaveProperty('value', 'first');
            });

            test('should return a response when the function errors', async () => {
                const r1 = await request(app).get('/'); // first
                const r2 = await request(app).get('/'); // rejected - return first
                const r3 = await request(app).get('/'); // second
                const r4 = await request(app).get('/'); // default

                expect(asyncMock).toHaveBeenCalledTimes(4);

                expect(r1.status).toEqual(200);
                expect(r2.status).toEqual(200);
                expect(r3.status).toEqual(200);
                expect(r4.status).toEqual(200);

                expect(r1.body).toHaveProperty('value', 'first');
                expect(r2.body).toHaveProperty('value', 'first');
                expect(r3.body).toHaveProperty('value', 'second');
                expect(r4.body).toHaveProperty('value', 'default');
            });
        });
    });

    describe('#refresh', () => {
        const refresh = async (cache, key, value, opts) => {
            const result = await cache.refresh(key, () => value, opts).catch(err => console.log(err));

            expect(result).toEqual(value);
            const parsed = await cache.get(key).then(res => JSON.parse(res));
            expect(parsed).toHaveProperty('value', value);
        };

        test('should refresh stores', async () => {
            const store = new SimpleMemoryStore();
            const cache = new Cache(store);

            await store.set('refresh', 'value');
            await expect(cache.get('refresh')).resolves.toEqual('value');

            await refresh(cache, 'refresh', 'updated', { staleTTL: 0 });
            await refresh(cache, 'refresh', 'reverted');
        });
    });

    describe('#createValueAndMultiSet', () => {
        const createValueAndMultiSet = async (cache, key, value, opts) => {
            const result = await cache
                .createValueAndMultiSet(key, value, opts)
                .then(res => res)
                .catch(err => console.log(err));

            expect(result).toHaveProperty('value', value);
            const parsed = await cache.get(key).then(res => JSON.parse(res));
            expect(parsed).toHaveProperty('value', value);
        };

        test('should refresh stores', async () => {
            const store = new SimpleMemoryStore();
            const cache = new Cache(store);
            const key = 'createValueAndMultiSet';
            const value = Date.now();

            await store.set(key, value);
            await expect(cache.get(key)).resolves.toEqual(value);

            await createValueAndMultiSet(cache, key, 'updated', { staleTTL: 0 });
            await createValueAndMultiSet(cache, key, 'reverted');
            const parsed = await cache.get(key).then(res => JSON.parse(res));
            expect(parsed).toHaveProperty('value', 'reverted');
        });
    });

    describe('#middleware', () => {
        const simpleStore1 = new SimpleMemoryStore();
        const simpleStore2 = new SimpleMemoryStore();
        const options = {
            name: 'middleware',
            staleTTL: 0.1,
            expireTTL: 0.5
        };

        let asyncMock;
        let cache;
        let app;

        let count = 0;

        beforeEach(() => {
            asyncMock = jest.fn(() => (count += 1));
            cache = new Cache([simpleStore1, simpleStore2], options);

            app = express();
            app.use(cache.middleware());
        });

        afterEach(() => {
            count = 0;
            asyncMock.mockReset();
        });

        test('should work in an express app', async () => {
            const endpoint = '/';
            app.get(endpoint, (req, res) => res.status(200).json({ value: asyncMock() }));
            // should count as 1 call
            const r1 = await request(app).get(endpoint);
            const r2 = await request(app).get(endpoint);

            expect(asyncMock).toHaveBeenCalledTimes(1);

            await delay(options.expireTTL * 1000);
            const r3 = await request(app).get(endpoint);

            expect(asyncMock).toHaveBeenCalledTimes(2);

            // miss -> cached
            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.body).toHaveProperty('value', 1);

            // cached -> expired
            expect(r3.headers).toHaveProperty('cache-status', 'expired');
            expect(r3.body).toHaveProperty('value', 2);
        });

        test('should not cache a post request by default', async () => {
            const endpoint = '/post';
            app.post(endpoint, (req, res) => res.status(200).json({ value: asyncMock() }));
            const r1 = await request(app).post(endpoint);
            const r2 = await request(app).post(endpoint);

            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r1.headers).toHaveProperty('cache-status', 'skipMethod');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'skipMethod');
            expect(r2.body).toHaveProperty('value', 2);
        });

        test('should work with stale data', async () => {
            const endpoint = '/stale';
            app.get(endpoint, (req, res) => res.status(200).json({ value: asyncMock() }));
            const r1 = await request(app).get(endpoint);
            const r2 = await request(app).get(endpoint);

            expect(asyncMock).toHaveBeenCalledTimes(1);
            await delay(options.expireTTL * 1000 - 100);

            const r3 = await request(app).get(endpoint);
            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.body).toHaveProperty('value', 1);

            expect(r3.headers).toHaveProperty('cache-status', 'cached');
            expect(r3.body).toHaveProperty('value', 1);
        });

        test('should work with stale data and removing headers', async () => {
            const endpoint = '/stale-remove-headers';
            app.get(endpoint, (req, res) => {
                res.removeHeader('content-type');
                return res.status(200).json({ value: asyncMock() });
            });

            const r1 = await request(app).get(endpoint);
            const r2 = await request(app).get(endpoint);

            expect(asyncMock).toHaveBeenCalledTimes(1);
            await delay(options.expireTTL * 1000 - 100);

            const r3 = await request(app).get(endpoint);
            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.body).toHaveProperty('value', 1);

            expect(r3.headers).toHaveProperty('cache-status', 'cached');
            expect(r3.body).toHaveProperty('value', 1);
        });

        test('should work with expired data', async () => {
            const endpoint = '/expired';
            app.get(endpoint, (req, res) => res.status(200).json({ value: asyncMock() }));

            // calls = 1
            const r0 = await request(app).get(endpoint);
            const r1 = await request(app).get(endpoint);
            expect(asyncMock).toHaveBeenCalledTimes(1);

            // calls = 2
            await delay(options.expireTTL * 1000);

            const r2 = await request(app).get(endpoint);
            const r3 = await request(app).get(endpoint);
            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r0.headers).toHaveProperty('cache-status', 'miss');
            expect(r0.body).toHaveProperty('value', 1);

            expect(r1.headers).toHaveProperty('cache-status', 'cached');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'expired');
            expect(r2.body).toHaveProperty('value', 2);

            expect(r3.headers).toHaveProperty('cache-status', 'cached');
            expect(r3.body).toHaveProperty('value', 2);
        });

        test('should work with bypass header', async () => {
            const endpoint = '/no-cache-bypass';
            app.get(endpoint, (req, res) => res.status(200).json({ value: asyncMock() }));
            // calls = 1
            const r0 = await request(app).get(endpoint);
            const r1 = await request(app).get(endpoint);
            // calls = 2, 3
            const r2 = await request(app)
                .get(endpoint)
                .set('cache-bypass', 'true');
            const r3 = await request(app)
                .get(endpoint)
                .set('cache-bypass', 'true');

            expect(asyncMock).toHaveBeenCalledTimes(3);

            expect(r0.headers).toHaveProperty('cache-status', 'miss');
            expect(r0.body).toHaveProperty('value', 1);

            expect(r1.headers).toHaveProperty('cache-status', 'cached');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'bypass');
            expect(r2.body).toHaveProperty('value', 2);

            expect(r3.headers).toHaveProperty('cache-status', 'bypass');
            expect(r3.body).toHaveProperty('value', 3);
        });

        test('should work with non-200 status', async () => {
            app.get('/404', (req, res) => res.status(404).json({ value: asyncMock() }));
            const r1 = await request(app).get('/404');
            const r2 = await request(app).get('/404');

            expect(asyncMock).toHaveBeenCalledTimes(1);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.body).toHaveProperty('value', 1);

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.body).toHaveProperty('value', 1);
        });

        test('should work with headers', async () => {
            app.get('/custom-header', (req, res) => {
                res.set('custom-header', asyncMock());
                return res.status(200).json({ value: asyncMock() });
            });

            const r1 = await request(app).get('/custom-header');
            const r2 = await request(app).get('/custom-header');

            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.headers).toHaveProperty('custom-header', '1');
            expect(r1.body).toHaveProperty('value', 2);

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.headers).toHaveProperty('custom-header', '1');
            expect(r2.body).toHaveProperty('value', 2);
        });

        test('should work with no content', async () => {
            app.get('/no-content', (req, res) => res.end());
            const r1 = await request(app).get('/no-content');
            const r2 = await request(app).get('/no-content');

            expect(asyncMock).toHaveBeenCalledTimes(0);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.status).toEqual(200);
            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.status).toEqual(200);
        });

        test('should work with strings', async () => {
            app.get('/strings', (req, res) => {
                res.write(`${asyncMock()}`);
                return res.end(`${asyncMock()}`);
            });

            const r1 = await request(app).get('/strings');
            const r2 = await request(app).get('/strings');

            expect(asyncMock).toHaveBeenCalledTimes(2);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.status).toEqual(200);
            expect(r1.text).toEqual('12');

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.status).toEqual(200);
            expect(r2.text).toEqual('12');
        });

        test('should work with buffers', async () => {
            app.get('/buffers', (req, res) => {
                res.write(Buffer.from(`${asyncMock()}`));
                return res.end(Buffer.from(`${asyncMock()}`));
            });

            const r1 = await request(app).get('/buffers');
            const r2 = await request(app).get('/buffers');
            const r3 = await request(app)
                .get('/buffers')
                .set('cache-bypass', 'true');

            expect(asyncMock).toHaveBeenCalledTimes(4);

            expect(r1.headers).toHaveProperty('cache-status', 'miss');
            expect(r1.status).toEqual(200);
            expect(r1.text).toEqual('12');

            expect(r2.headers).toHaveProperty('cache-status', 'cached');
            expect(r2.status).toEqual(200);
            expect(r2.text).toEqual('12');

            expect(r3.headers).toHaveProperty('cache-status', 'bypass');
            expect(r3.status).toEqual(200);
            expect(r3.text).toEqual('34');
        });
    });
});
