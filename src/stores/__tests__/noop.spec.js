// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

import { NoopStore } from 'src/stores/noop';
import { NotFoundError } from 'src/errors/notFound';

describe('NoopStore', () => {
  
  describe('#getClassName()', () => {
    test('should return class name', () => {
      const store = new NoopStore();
      expect(store.getClassName()).toEqual('NoopStore');
    });
  });
  
  describe('#get()', () => {
    test('should return a rejected promise', async () => {
      const store = new NoopStore();
      await expect(store.get('test')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
  
  describe('#set()', () => {
    test('should return a rejected promise for a set value', async () => {
      const store = new NoopStore();
      await expect(store.set('test', 'value')).resolves.toEqual('value');
      await expect(store.get('test')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
