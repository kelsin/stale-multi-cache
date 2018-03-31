// @flow
// region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
// endregion

import { Util, Is } from 'src/util';

const { Promise } = global;

describe('Util', () => {
    describe('#exec()', () => {
        test('should return a value when resolved', async () => {
            const [err, data] = await Util.exec(Promise.resolve(true));
            expect(data).toBeTruthy();
        });

        test('should return a freeze object', async () => {
            const [err, data] = await Util.exec(Promise.resolve({ a: 1 }), null, true);
            expect(data).toBeDefined();
            expect(data.a).toBeDefined();

            expect(() => {
                data.a = 2;
            }).toThrowError('Cannot assign to read only property');
        });

        test('should return an error when promise is rejected', async () => {
            const [err, data] = await Util.exec(Promise.reject({ a: 1 }), null);
            expect(err).toBeDefined();
        });

        test('should add external properties to the error object', async () => {
            const [err, data] = await Util.exec(Promise.reject({ a: 1 }), { b: 2 });
            expect(err).toBeDefined();
            expect(err.a).toBeDefined();
            expect(err.b).toBeDefined();
        });
    });
});
