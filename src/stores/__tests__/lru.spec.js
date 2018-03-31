// @flow
//region typing, stripped during compiling
import type { describe, test, expect } from '@types/jest';
//endregion

import { LRUMemoryStore } from 'src/stores/lru';
import { NotFoundError } from 'src/errors/notFound';

describe('LRUMemoryStore', () => {
  
  describe('#getClassName()', () => {
    test('should return class name', () => {
      const store = new LRUMemoryStore();
      expect(store.getClassName()).toEqual('LRUMemoryStore');
    });
  });
  
  describe('#get()', () => {
    test('should return a rejected promise for an unknown value', async () => {
      const store = new LRUMemoryStore();
      await expect(store.get('test')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
  
  describe('#set()', () => {
    test('should return a resolved promise for a set value', async () => {
      const store = new LRUMemoryStore();
      await expect(store.set('test', 'value')).resolves.toEqual('value');
      await expect(store.get('test')).resolves.toEqual('value');
    });
  });
  
  describe('with a max set to 1', () => {
    test('should override previous values', async () => {
      const store = new LRUMemoryStore({max: 1});
  
      await expect(store.set('test1', 'value1')).resolves.toEqual('value1');
      await expect(store.get('test1')).resolves.toEqual('value1');
      
      // Adding in a second value should bump the first
      await expect(store.set('test2', 'value2')).resolves.toEqual('value2');
      await expect(store.get('test1')).rejects.toBeInstanceOf(NotFoundError);
      await expect(store.get('test2')).resolves.toEqual('value2');
    });
  });
});