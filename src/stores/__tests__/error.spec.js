// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

import { ErrorStore } from 'src/stores/error';

describe('ErrorStore', () => {
  
  describe('#getClassName()', () => {
    test('should return class name', () => {
      const store = new ErrorStore();
      expect(store.getClassName()).toEqual('ErrorStore');
    });
  });
  
  describe('#get()', () => {
    test('should return a rejected promise', async () => {
      const store = new ErrorStore();
      await expect(store.get('test')).rejects.toBeInstanceOf(Error);
    });
  });
  
  describe('#set()', () => {
    test('should return a rejected promise for a set value', async () => {
      const store = new ErrorStore();
      await expect(store.set('test', 'value')).rejects.toBeInstanceOf(Error);
    });
  });
});
