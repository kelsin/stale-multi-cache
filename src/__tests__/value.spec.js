// @flow
// region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
// endregion

import moment from 'moment';
import stringify from 'fast-safe-stringify';
import { Value } from 'src/value';

// Times to play with
const momentSource = moment.now;

const now = moment();
const tomorrow = moment(now).add(1, 'day');
const yesterday = moment(now).subtract(1, 'day');

describe('Value', () => {
    beforeAll(() => {
        moment.now = () => now.valueOf();
    });

    afterAll(() => {
        moment.now = momentSource;
    });

    describe('#get()', () => {
        test('should return the value that was set', () => {
            const value = Value.build('test', tomorrow);
            expect(value.get()).toEqual('test');
        });
    });

    describe('#getCreated()', () => {
        test('should return the time that this value was created', () => {
            const value = Value.build('test', tomorrow);
            expect(value.getCreated()).toEqual(tomorrow);
        });
    });

    describe('#getExpireAt()', () => {
        test('should return the expires value that was set', () => {
            const value = Value.build('test', now);
            value.setExpireTTL(300);
            const expireMoment = moment(now).add(300, 'seconds');
            expect(value.getExpireAt().isSame(expireMoment)).toBeTruthy();
        });

        test('should return undefined if expires was not set', () => {
            const value = Value.build('test');
            expect(value.getExpireAt()).toBeUndefined();
        });
    });

    describe('#getExpireTTL()', () => {
        test('should return the expire ttl value that was set', () => {
            const value = Value.build('test', now);
            value.setExpireTTL(300);
            expect(value.getExpireTTL()).toEqual(300);
        });

        test('should return undefined if expires was not set', () => {
            const value = Value.build('test');
            expect(value.getExpireTTL()).toBeUndefined();
        });
    });

    describe('#getStaleAt()', () => {
        test('should return the stale value that was set', () => {
            const value = Value.build('test', now);
            value.setStaleTTL(300);
            const staleMoment = moment(now).add(300, 'seconds');
            expect(value.getStaleAt().isSame(staleMoment)).toBeTruthy();
        });

        test('should return undefined if stale was not set', () => {
            const value = Value.build('test');
            expect(value.getStaleAt()).toBeUndefined();
        });
    });

    describe('#getStaleTTL()', () => {
        test('should return the stale ttl value that was set', () => {
            const value = Value.build('test', now);
            value.setStaleTTL(300);
            expect(value.getStaleTTL()).toEqual(300);
        });

        test('should return undefined if stale was not set', () => {
            const value = Value.build('test');
            expect(value.getStaleTTL()).toBeUndefined();
        });
    });

    describe('#getMaxAge()', () => {
        test('should return time in seconds', () => {
            const value = Value.build('test', now);
            value.setStaleTTL(60);
            expect(value.getMaxAge()).toEqual(60);
        });

        test('should not show negative values', () => {
            const value = Value.build('test', yesterday);

            value.setStaleTTL(0);
            expect(value.getMaxAge()).toEqual(0);

            value.setStaleTTL(undefined);
            value.setExpireTTL(0);
            expect(value.getMaxAge()).toEqual(0);

            value.setExpireTTL(undefined);
            expect(value.getMaxAge()).toEqual(0);
        });
    });

    describe('#getCacheControl()', () => {
        test('should return time in seconds', () => {
            const value = Value.build('test', now);
            value.setStaleTTL(60);
            expect(value.getCacheControl()).toEqual('public, max-age=60');
        });

        test('should not show negative values', () => {
            const value = Value.build('test', yesterday);

            value.setStaleTTL(0);
            expect(value.getCacheControl()).toEqual('no-cache, no-store, must-revalidate');

            value.setStaleTTL(undefined);
            value.setExpireTTL(0);
            expect(value.getCacheControl()).toEqual('no-cache, no-store, must-revalidate');

            value.setExpireTTL(undefined);
            expect(value.getCacheControl()).toEqual('no-cache, no-store, must-revalidate');
        });
    });

    describe('#set()', () => {
        test('should change the value', () => {
            const value = Value.build('test', tomorrow);
            expect(value.get()).toEqual('test');
            value.set('test2');
            expect(value.get()).toEqual('test2');
        });
    });

    describe('#expired()', () => {
        test('should return false for an object with no expire ttl', () => {
            const value = Value.build('test');
            expect(value.expired()).toBeFalsy();
        });

        test('should return false for an object with only stale ttl', () => {
            const value = Value.build('test');
            value.setStaleTTL(0);
            expect(value.expired()).toBeFalsy();
        });

        test('should return false for an object that is not expired', () => {
            const value = Value.build('test');
            value.setExpireTTL(300);
            expect(value.expired()).toBeFalsy();
        });

        test('should return true for an object that is expired', () => {
            const value = Value.build('test');
            value.setExpireTTL(0);
            expect(value.expired()).toBeTruthy();
        });
    });

    describe('#stale()', () => {
        test('should return false for an object with no ttl', () => {
            const value = Value.build('test');
            expect(value.stale()).toBeFalsy();
        });

        test('should return false for an object with only expire ttl', () => {
            const value = Value.build('test');
            value.setExpireTTL(0);
            expect(value.stale()).toBeFalsy();
        });

        test('should return false for an object that is not stale', () => {
            const value = Value.build('test');
            value.setStaleTTL(300);
            expect(value.stale()).toBeFalsy();
        });

        test('should return true for an object that is stale', () => {
            const value = Value.build('test');
            value.setStaleTTL(0);
            expect(value.stale()).toBeTruthy();
        });
    });

    describe('#setExpireTTL()', () => {
        test('should change the expires', () => {
            const value = Value.build('test');
            expect(value.expired()).toBeFalsy();
            value.setExpireTTL(0);
            expect(value.expired()).toBeTruthy();
        });

        test('passing undefined should not expire the object', () => {
            const value = Value.build('test');
            expect(value.expired()).toBeFalsy();
            value.setExpireTTL(undefined);
            expect(value.expired()).toBeFalsy();
        });
    });

    describe('#setStaleTTL()', () => {
        test('should change the stale', () => {
            const value = Value.build('test');
            expect(value.stale()).toBeFalsy();
            value.setStaleTTL(0);
            expect(value.stale()).toBeTruthy();
        });

        test('passing undefined should not stale the object', () => {
            const value = Value.build('test');
            expect(value.stale()).toBeFalsy();
            value.setStaleTTL(undefined);
            expect(value.stale()).toBeFalsy();
        });
    });

    describe('json serialization', () => {
        test('should be able to serialize to json and back', () => {
            const value = Value.build('test');

            value.setStaleTTL(300);
            value.setExpireTTL(600);

            const json = stringify(value);
            const serialized = Value.fromJSON(json);

            expect(value.get()).toEqual(serialized.get());
            expect(value.getExpireTTL()).toEqual(serialized.getExpireTTL());
            expect(value.getStaleTTL()).toEqual(serialized.getStaleTTL());
            expect(value.getCreated().isSame(serialized.getCreated())).toBeTruthy();
            expect(value.getExpireAt().isSame(serialized.getExpireAt())).toBeTruthy();
            expect(value.getStaleAt().isSame(serialized.getStaleAt())).toBeTruthy();
        });
    });
});
